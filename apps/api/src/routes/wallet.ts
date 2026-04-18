import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { creditUserWallet, creditVendorWallet } from "../lib/wallet";
import { audit } from "../lib/audit";

const router = Router();

// Customer wallet
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { walletBalance: true, loyaltyPoints: true },
    });
    const txns = await prisma.walletTransaction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ balance: u?.walletBalance ?? 0, loyalty: u?.loyaltyPoints ?? 0, transactions: txns });
  } catch (e) {
    next(e);
  }
});

const rechargeSchema = z.object({ amountPaise: z.number().int().min(10000) });

router.post("/recharge", requireAuth, async (req, res, next) => {
  try {
    const { amountPaise } = rechargeSchema.parse(req.body);
    // In production, this would create a Razorpay order and confirm via webhook.
    // For dev, we credit immediately and log it as a fake recharge.
    const txn = await creditUserWallet(req.user!.sub, {
      amountPaise,
      reason: "RECHARGE",
      note: "Dev mode recharge",
    });
    await audit(req.user!.sub, "WALLET_RECHARGE", "User", req.user!.sub, { amountPaise });
    res.json({ transaction: txn });
  } catch (e) {
    next(e);
  }
});

// Vendor wallet (separate path under vendor router as well; this is a convenience)
router.get("/vendor", requireAuth, async (req, res, next) => {
  try {
    const v = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!v) return res.status(404).json({ error: "Vendor not found" });
    const txns = await prisma.walletTransaction.findMany({
      where: { vendorId: v.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ balance: v.walletBalance, transactions: txns });
  } catch (e) {
    next(e);
  }
});

router.post("/vendor/recharge", requireAuth, async (req, res, next) => {
  try {
    const { amountPaise } = rechargeSchema.parse(req.body);
    const v = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!v) return res.status(404).json({ error: "Vendor not found" });
    const txn = await creditVendorWallet(v.id, {
      amountPaise,
      reason: "RECHARGE",
      note: "Dev mode vendor recharge",
    });
    res.json({ transaction: txn });
  } catch (e) {
    next(e);
  }
});

export default router;
