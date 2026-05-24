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
      commissionPercent: s.commissionPercent,
      commissionThreshold: s.commissionThreshold,
      commissionPercentBelow: s.commissionPercentBelow,
      vendorRegistrationFee: s.vendorRegistrationFee,
      loyaltyValuePaise: s.loyaltyValuePaise,
      features: s.features,
      emiEnabled: s.emiEnabled,
      emiMinAmountPaise: s.emiMinAmountPaise,
      emiTenures: s.emiTenures,
      emiInterestPercent: s.emiInterestPercent,
      exitIntentCouponCode: s.exitIntentCouponCode,
      exitIntentMessage: s.exitIntentMessage,
      announcementBar: s.announcementBar,
      announcementLink: s.announcementLink,
      codEnabled: s.codEnabled,
      codMaxOrderPaise: s.codMaxOrderPaise,
      codFeePaise: s.codFeePaise,
      returnWindowDays: s.returnWindowDays,
      brandLogo: s.brandLogo,
      brandFavicon: s.brandFavicon,
      brandPrimary: s.brandPrimary,
      brandAccent: s.brandAccent,
      brandDark: s.brandDark,
      footerAddress: s.footerAddress,
      footerGstin: s.footerGstin,
      footerCopyright: s.footerCopyright,
      socialFacebook: s.socialFacebook,
      socialInstagram: s.socialInstagram,
      socialTwitter: s.socialTwitter,
      socialYoutube: s.socialYoutube,
      socialWhatsapp: s.socialWhatsapp,
      payRazorpayEnabled: s.payRazorpayEnabled,
      payWalletEnabled: s.payWalletEnabled,
      payUpiEnabled: s.payUpiEnabled,
      heroTitle: s.heroTitle,
      heroSubtitle: s.heroSubtitle,
      heroCtaText: s.heroCtaText,
      heroCtaLink: s.heroCtaLink,
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
  // Paise/integer columns: Prisma's Int fields reject fractional JS numbers
  // with an unhandled error, so validate .int() here to surface a 400 to the
  // admin instead of a 500. Percent fields stay float-capable (0-100).
  commissionThreshold: z.number().int().min(0).optional(),
  commissionPercentBelow: z.number().min(0).max(100).optional(),
  vendorRegistrationFee: z.number().int().min(0).optional(),
  freeShippingMin: z.number().int().min(0).optional(),
  shippingFee: z.number().int().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  loyaltyEarnPer100: z.number().int().min(0).optional(),
  loyaltyValuePaise: z.number().int().min(0).optional(),
  loyaltyMaxRedeemPct: z.number().min(0).max(100).optional(),
  referralBonusPaise: z.number().int().min(0).optional(),
  adMinBudgetPaise: z.number().int().min(0).optional(),
  adClickCostPaise: z.number().int().min(0).optional(),
  adImpressionCostPaise: z.number().int().min(0).optional(),
  siteName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  features: z.record(z.boolean()).optional(),
  // EMI
  emiEnabled: z.boolean().optional(),
  emiMinAmountPaise: z.number().int().min(0).optional(),
  emiTenures: z.array(z.number().int().min(1).max(60)).optional(),
  emiInterestPercent: z.number().min(0).max(50).optional(),
  // Marketing
  exitIntentCouponCode: z.string().max(40).optional(),
  exitIntentMessage: z.string().max(200).optional(),
  announcementBar: z.string().max(300).optional(),
  announcementLink: z.string().nullable().optional(),
  // COD
  codEnabled: z.boolean().optional(),
  codMaxOrderPaise: z.number().int().min(0).optional(),
  codFeePaise: z.number().int().min(0).optional(),
  // Returns
  returnWindowDays: z.number().int().min(0).max(365).optional(),
  // Wallet cashback tiers. Non-overlapping rows keyed by min recharge amount.
  // Empty array disables the feature; max 10 tiers to keep the UI sane.
  walletCashbackTiers: z
    .array(
      z.object({
        minPaise: z.number().int().positive(),
        cashbackPaise: z.number().int().positive(),
      }),
    )
    .max(10)
    .optional(),
  // Branding & theme
  brandLogo: z.string().nullable().optional(),
  brandFavicon: z.string().nullable().optional(),
  brandPrimary: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  brandAccent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  brandDark: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  footerAddress: z.string().max(500).optional(),
  footerGstin: z.string().max(50).optional(),
  footerCopyright: z.string().max(200).optional(),
  socialFacebook: z.string().nullable().optional(),
  socialInstagram: z.string().nullable().optional(),
  socialTwitter: z.string().nullable().optional(),
  socialYoutube: z.string().nullable().optional(),
  socialWhatsapp: z.string().nullable().optional(),
  payRazorpayEnabled: z.boolean().optional(),
  payWalletEnabled: z.boolean().optional(),
  payUpiEnabled: z.boolean().optional(),
  heroTitle: z.string().max(100).nullable().optional(),
  heroSubtitle: z.string().max(200).nullable().optional(),
  heroCtaText: z.string().max(40).nullable().optional(),
  heroCtaLink: z.string().max(300).nullable().optional(),
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
