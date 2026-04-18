import { prisma } from "./prisma";
import { debitVendorWallet } from "./wallet";

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
  await prisma.$transaction([
    prisma.adCampaign.update({
      where: { id: campaignId },
      data: { impressions: { increment: 1 }, spentPaise: { increment: cost } },
    }),
    prisma.adEvent.create({
      data: { campaignId, type: "IMPRESSION", costPaise: cost, userId },
    }),
  ]);
  if (cost > 0) {
    try {
      await debitVendorWallet(c.vendorId, {
        amountPaise: cost,
        reason: "AD_SPEND",
        ref: campaignId,
      });
    } catch {
      await prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: "PAUSED" },
      });
    }
  }
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
  await prisma.$transaction([
    prisma.adCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 }, spentPaise: { increment: cost } },
    }),
    prisma.adEvent.create({
      data: { campaignId, type: "CLICK", costPaise: cost, userId },
    }),
  ]);
  try {
    await debitVendorWallet(c.vendorId, {
      amountPaise: cost,
      reason: "AD_SPEND",
      ref: campaignId,
    });
  } catch {
    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED" },
    });
  }
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
