import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { getSettings, patchSettings } from "../lib/settings";
import { audit } from "../lib/audit";

const router = Router();

router.get("/public", async (_req, res, next) => {
  try {
    const s = await getSettings();
    res.json({
      siteName: s.siteName,
      supportEmail: s.supportEmail,
      supportPhone: s.supportPhone,
      maintenanceMode: s.maintenanceMode,
      freeShippingMin: s.freeShippingMin,
      shippingFee: s.shippingFee,
      taxPercent: s.taxPercent,
      loyaltyValuePaise: s.loyaltyValuePaise,
      features: s.features,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    res.json({ settings: await getSettings() });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  commissionPercent: z.number().min(0).max(100).optional(),
  commissionThreshold: z.number().min(0).optional(),
  commissionPercentBelow: z.number().min(0).max(100).optional(),
  freeShippingMin: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  loyaltyEarnPer100: z.number().min(0).optional(),
  loyaltyValuePaise: z.number().min(0).optional(),
  loyaltyMaxRedeemPct: z.number().min(0).max(100).optional(),
  referralBonusPaise: z.number().min(0).optional(),
  adMinBudgetPaise: z.number().min(0).optional(),
  adClickCostPaise: z.number().min(0).optional(),
  adImpressionCostPaise: z.number().min(0).optional(),
  siteName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  features: z.record(z.boolean()).optional(),
});

router.patch("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const updated = await patchSettings(body);
    await audit(req.user!.sub, "SETTINGS_UPDATE", "AppSettings", "default", body);
    res.json({ settings: updated });
  } catch (e) {
    next(e);
  }
});

router.get("/audit", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    res.json({ items: logs });
  } catch (e) {
    next(e);
  }
});

export default router;
