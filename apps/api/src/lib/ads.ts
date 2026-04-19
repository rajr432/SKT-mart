import { prisma } from "./prisma";

type AdEventType = "IMPRESSION" | "CLICK" | "CONVERSION";

/**
 * Charge the vendor's wallet and record spend atomically. Either:
 *   - wallet is debited, campaign spentPaise increments, AdEvent row is written, or
 *   - nothing changes and the campaign is paused (insufficient funds).
 *
 * Keeping all three writes in one interactive transaction avoids the desync
 * where spentPaise could advance without a matching wallet debit.
 */
async function chargeAndRecord(
  campaignId: string,
  type: AdEventType,
  costPaise: number,
  userId?: string,
): Promise<"CHARGED" | "PAUSED"> {
  try {
    await prisma.$transaction(async (tx) => {
      const v = await tx.vendor.findFirst({
        where: { campaigns: { some: { id: campaignId } } },
        select: { id: true, walletBalance: true },
      });
      if (!v) throw new Error("Vendor not found");
      if (v.walletBalance < costPaise) throw new Error("Insufficient vendor wallet");

      const vendor = await tx.vendor.update({
        where: { id: v.id },
        data: { walletBalance: { decrement: costPaise } },
        select: { walletBalance: true },
      });
      await tx.walletTransaction.create({
        data: {
          vendorId: v.id,
          type: "DEBIT",
          reason: "AD_SPEND",
          amountPaise: costPaise,
          balanceAfter: vendor.walletBalance,
          ref: campaignId,
        },
      });
      await tx.adCampaign.update({
        where: { id: campaignId },
        data: {
          spentPaise: { increment: costPaise },
          ...(type === "IMPRESSION"
            ? { impressions: { increment: 1 } }
            : type === "CLICK"
              ? { clicks: { increment: 1 } }
              : { conversions: { increment: 1 } }),
        },
      });
      await tx.adEvent.create({
        data: { campaignId, type, costPaise, userId },
      });
    });
    return "CHARGED";
  } catch (err) {
    // Only pause the campaign for deterministic "can't fund this charge" errors.
    // Transient DB failures must bubble up so the caller (route handler) can
    // surface a 500 via the error middleware instead of silently disabling ads.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Insufficient vendor wallet" || msg === "Vendor not found") {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: "PAUSED" },
      });
      return "PAUSED";
    }
    throw err;
  }
}

export async function recordAdImpression(
  campaignId: string,
  costPaise: number,
  userId?: string,
) {
  const c = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!c || c.status !== "ACTIVE") return null;
  const remaining = c.budgetPaise - c.spentPaise;
  const cost = Math.min(costPaise, remaining);
  if (cost <= 0) {
    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED" },
    });
    return null;
  }
  return chargeAndRecord(campaignId, "IMPRESSION", cost, userId);
}

export async function recordAdClick(
  campaignId: string,
  userId?: string,
) {
  const c = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!c || c.status !== "ACTIVE") return null;
  const cost = Math.min(c.bidPaise, c.budgetPaise - c.spentPaise);
  if (cost <= 0) {
    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED" },
    });
    return null;
  }
  return chargeAndRecord(campaignId, "CLICK", cost, userId);
}

export async function getSponsoredProductIds(
  categoryId?: string,
  limit = 4,
): Promise<string[]> {
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
  };
  if (categoryId) {
    where.product = { categoryId };
  }
  const camps = await prisma.adCampaign.findMany({
    where: where as never,
    orderBy: { bidPaise: "desc" },
    take: limit,
    select: { productId: true },
  });
  return camps.map((c) => c.productId);
}
