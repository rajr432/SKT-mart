import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { recordAdClick, recordAdImpression } from "../lib/ads";
import { getSettings } from "../lib/settings";

const router = Router();

async function getVendorId(userId: string) {
  const v = await prisma.vendor.findUnique({ where: { userId } });
  return v?.id;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const vendorId = await getVendorId(req.user!.sub);
    if (!vendorId) return res.status(404).json({ error: "Vendor not found" });
    const items = await prisma.adCampaign.findMany({
      where: { vendorId },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  productId: z.string(),
  name: z.string().min(2),
  budgetPaise: z.number().int().min(1),
  bidPaise: z.number().int().min(100),
  endsAt: z.string().datetime().optional(),
  keyword: z.string().optional(),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const vendorId = await getVendorId(req.user!.sub);
    if (!vendorId) return res.status(404).json({ error: "Vendor not found" });
    const settings = await getSettings();
    if (body.budgetPaise < settings.adMinBudgetPaise) {
      return res.status(400).json({ error: `Min budget is ${settings.adMinBudgetPaise / 100} INR` });
    }
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || product.vendorId !== vendorId) {
      return res.status(404).json({ error: "Product not found" });
    }
    const campaign = await prisma.adCampaign.create({
      data: {
        vendorId,
        productId: body.productId,
        name: body.name,
        budgetPaise: body.budgetPaise,
        bidPaise: body.bidPaise,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        keyword: body.keyword,
        status: "DRAFT",
      },
    });
    res.status(201).json({ campaign });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/activate", requireAuth, async (req, res, next) => {
  try {
    const vendorId = await getVendorId(req.user!.sub);
    if (!vendorId) return res.status(404).json({ error: "Vendor not found" });
    const c = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!c || c.vendorId !== vendorId) return res.status(404).json({ error: "Not found" });
    const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!v || v.walletBalance < c.budgetPaise) {
      return res.status(400).json({ error: "Insufficient wallet balance to fund the campaign" });
    }
    const updated = await prisma.adCampaign.update({
      where: { id: c.id },
      data: { status: "ACTIVE" },
    });
    res.json({ campaign: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/pause", requireAuth, async (req, res, next) => {
  try {
    const vendorId = await getVendorId(req.user!.sub);
    if (!vendorId) return res.status(404).json({ error: "Vendor not found" });
    const c = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!c || c.vendorId !== vendorId) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.adCampaign.update({
      where: { id: c.id },
      data: { status: "PAUSED" },
    });
    res.json({ campaign: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const vendorId = await getVendorId(req.user!.sub);
    if (!vendorId) return res.status(404).json({ error: "Vendor not found" });
    const c = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!c || c.vendorId !== vendorId) return res.status(404).json({ error: "Not found" });
    await prisma.adCampaign.delete({ where: { id: c.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Public tracking endpoints
router.post("/track/impression/:id", async (req, res, next) => {
  try {
    await recordAdImpression(
      req.params.id,
      (await getSettings()).adImpressionCostPaise,
      typeof req.body?.userId === "string" ? req.body.userId : undefined,
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/track/click/:id", async (req, res, next) => {
  try {
    await recordAdClick(
      req.params.id,
      typeof req.body?.userId === "string" ? req.body.userId : undefined,
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
