import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { recordAdClick, recordAdImpression } from "../lib/ads";
import { getSettings } from "../lib/settings";

const router = Router();

// Per-(IP,campaign) rate limiting on the public tracking endpoints to prevent
// wallet-draining by anyone who knows a campaign id. Impressions get a higher
// budget than clicks since they're cheaper.
const impressionLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `imp:${req.ip}:${req.params.id}`,
});
const clickLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `clk:${req.ip}:${req.params.id}`,
});

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
    // Pay-as-you-go model: each click/impression is charged against the
    // vendor wallet at display time (see lib/ads.ts chargeAndRecord), which
    // auto-pauses the campaign on insufficient balance. We therefore only
    // require the wallet to hold at least ONE click's worth of funding at
    // activation — validating the full budget here was misleading because
    // the balance could be spent elsewhere before first charge; the check
    // provided false assurance. Clients must top-up if they want the
    // campaign to keep running, which is the intended ads semantics.
    if (!v || v.walletBalance < c.bidPaise) {
      return res.status(400).json({
        error: `Vendor wallet must have at least ₹${(c.bidPaise / 100).toFixed(2)} (one click's cost) to activate. Ads are pay-as-you-go and will auto-pause when balance is depleted.`,
      });
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

// Public tracking endpoints. optionalAuth attaches req.user when the caller is
// logged in; we deliberately ignore req.body.userId so the client cannot
// attribute events to arbitrary users. The per-(IP, campaign) rate limiters
// above cap the damage a single IP can inflict on any one vendor's wallet.
router.post("/track/impression/:id", impressionLimiter, optionalAuth, async (req, res, next) => {
  try {
    await recordAdImpression(
      req.params.id,
      (await getSettings()).adImpressionCostPaise,
      req.user?.sub,
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/track/click/:id", clickLimiter, optionalAuth, async (req, res, next) => {
  try {
    await recordAdClick(req.params.id, req.user?.sub);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
