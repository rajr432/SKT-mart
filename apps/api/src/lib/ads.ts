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
      // the same stale remaining budget. Status + budget are checked on the
      // fresh row; the conditional spentPaise increment below provides the
      // atomic claim (Prisma's updateMany requires a non-empty data clause,
      // so we can't use it as a pure lock here).
      const camp = await tx.adCampaign.findUniqueOrThrow({
        where: { id: campaignId },
        select: { status: true, budgetPaise: true, spentPaise: true, vendorId: true },
      });
      if (camp.status !== "ACTIVE") throw new Error("Campaign not active");
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
    if (msg === "Budget exhausted") {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
      return "BUDGET_EXHAUSTED";
    }
    // "Campaign not active" means the tx-fresh re-read didn't find an
    // ACTIVE row — that could be because a vendor legitimately PAUSED
    // it between the outer check and the tx. Do NOT overwrite the
    // status; just abort this charge so the vendor retains control.
    if (msg === "Campaign not active") {
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
  // Exclude campaigns whose spent ≥ budget. Without this filter, campaigns
  // that have exhausted their budget but haven't been lazily flipped to
  // COMPLETED still show up here and every page render fires a pointless
  // chargeAndRecord tx that immediately throws "Budget exhausted". Prisma
  // supports column-to-column comparison via `prisma.<model>.fields`.
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    spentPaise: { lt: prisma.adCampaign.fields.budgetPaise },
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
