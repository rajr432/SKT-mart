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
): Promise<"CHARGED" | "PAUSED" | "BUDGET_EXHAUSTED"> {
  try {
    await prisma.$transaction(async (tx) => {
      // Re-read campaign inside tx to guard against concurrent callers who read
      // the same stale remaining budget. If two threads each saw remaining=100
      // and cost=100 outside the tx, we want only one of them to succeed.
      const budgetClaim = await tx.adCampaign.updateMany({
        where: {
          id: campaignId,
          status: "ACTIVE",
          spentPaise: { lte: 2147483647 - costPaise }, // overflow guard
          // Ensure spentPaise + cost <= budgetPaise by requiring budget ≥ spent + cost
          // Prisma doesn't allow cross-column comparisons directly; enforce via raw guard below.
        },
        data: {},
      });
      if (budgetClaim.count === 0) throw new Error("Campaign not active");
      const camp = await tx.adCampaign.findUniqueOrThrow({
        where: { id: campaignId },
        select: { budgetPaise: true, spentPaise: true, vendorId: true },
      });
      if (camp.spentPaise + costPaise > camp.budgetPaise) {
        throw new Error("Budget exhausted");
      }

      // Race-safe debit: conditional UPDATE guards against two concurrent ad
      // charges both passing a stale sufficiency check and driving the wallet
      // negative. If the WHERE predicate doesn't match, claim.count === 0 and
      // we throw the canonical "Insufficient vendor wallet" so the outer
      // catch pauses the campaign.
      const claim = await tx.vendor.updateMany({
        where: { id: camp.vendorId, walletBalance: { gte: costPaise } },
        data: { walletBalance: { decrement: costPaise } },
      });
      if (claim.count === 0) throw new Error("Insufficient vendor wallet");
      const vendor = await tx.vendor.findUniqueOrThrow({
        where: { id: camp.vendorId },
        select: { walletBalance: true },
      });
      await tx.walletTransaction.create({
        data: {
          vendorId: camp.vendorId,
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
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Insufficient vendor wallet" || msg === "Vendor not found") {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: "PAUSED" },
      });
      return "PAUSED";
    }
    if (msg === "Budget exhausted" || msg === "Campaign not active") {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
      return "BUDGET_EXHAUSTED";
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
