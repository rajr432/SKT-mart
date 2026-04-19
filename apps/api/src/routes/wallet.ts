import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { creditUserWallet, creditVendorWallet } from "../lib/wallet";
import { audit } from "../lib/audit";
import { getRazorpay, verifyRazorpaySignature } from "../lib/razorpay";
import { HttpError } from "../middleware/error";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";

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
const confirmSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

// Step 1: create Razorpay order for recharge (required in production)
router.post("/recharge/create", requireAuth, async (req, res, next) => {
  try {
    const { amountPaise } = rechargeSchema.parse(req.body);
    const rz = getRazorpay();
    if (!rz) throw new HttpError(503, "Payment gateway not configured");
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `rc_${req.user!.sub.slice(0, 8)}_${Date.now()}`,
      notes: { userId: req.user!.sub, kind: "WALLET_RECHARGE" },
    });
    res.json({
      razorpayOrderId: order.id,
      amount: amountPaise,
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
    });
  } catch (e) {
    next(e);
  }
});

// Step 2: confirm Razorpay payment and credit wallet
router.post("/recharge/confirm", requireAuth, async (req, res, next) => {
  try {
    const body = confirmSchema.parse(req.body);
    const valid = verifyRazorpaySignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
    if (!valid) throw new HttpError(400, "Invalid signature");
    // Verify with Razorpay BEFORE entering the tx so the tx is short.
    const rz = getRazorpay();
    if (!rz) throw new HttpError(503, "Payment gateway not configured");
    const payment = await rz.payments.fetch(body.razorpayPaymentId);
    const amountPaise = typeof payment.amount === "number"
      ? payment.amount
      : parseInt(String(payment.amount), 10);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0)
      throw new HttpError(400, "Invalid payment amount");
    if (payment.status !== "captured" && payment.status !== "authorized")
      throw new HttpError(400, `Payment not captured (status: ${payment.status})`);

    // Atomic dedupe via DB-level unique constraint on PaymentDedup.paymentRef.
    // Pure in-tx findFirst is NOT sufficient under Postgres READ COMMITTED:
    // two concurrent interactive transactions each see "no duplicate"
    // (neither has committed its WalletTransaction yet) and both credit the
    // wallet. Claiming a unique row on PaymentDedup inside the same tx is
    // the authoritative serialization point — the second concurrent tx hits
    // P2002 on commit and rolls back cleanly. On retry it reads the existing
    // claim and returns the original WalletTransaction idempotently.
    const userId = req.user!.sub;
    const paymentRef = body.razorpayPaymentId;
    let dedup = false;
    let txn;
    try {
      txn = await prisma.$transaction(async (tx) => {
        await tx.paymentDedup.create({
          data: {
            paymentRef,
            kind: "WALLET_RECHARGE_USER",
            consumerId: userId,
            amountPaise,
          },
        });
        return creditUserWallet(
          userId,
          { amountPaise, reason: "RECHARGE", ref: paymentRef, note: "Razorpay recharge" },
          tx,
        );
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        // Replay / concurrent loser — return the existing credit idempotently.
        const existing = await prisma.paymentDedup.findUnique({ where: { paymentRef } });
        if (!existing) throw e;
        if (existing.kind !== "WALLET_RECHARGE_USER" || existing.consumerId !== userId)
          throw new HttpError(400, "Payment already consumed by another flow");
        const prior = await prisma.walletTransaction.findFirst({
          where: { ref: paymentRef, userId },
          orderBy: { createdAt: "desc" },
        });
        if (!prior) throw new HttpError(500, "Inconsistent dedup state");
        dedup = true;
        txn = prior;
      } else {
        throw e;
      }
    }
    const result = { txn, dedup };
    if (!result.dedup) {
      await audit(userId, "WALLET_RECHARGE", "User", userId, {
        amountPaise,
        paymentId: paymentRef,
      });
    }
    res.json({ transaction: result.txn });
  } catch (e) {
    next(e);
  }
});

// DEV-only convenience: instant recharge without payment. Blocked in production.
router.post("/recharge", requireAuth, async (req, res, next) => {
  try {
    if (IS_PROD)
      throw new HttpError(
        403,
        "Use /wallet/recharge/create and /wallet/recharge/confirm in production",
      );
    const { amountPaise } = rechargeSchema.parse(req.body);
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

// Vendor wallet
router.get("/vendor", requireAuth, requireRole("VENDOR"), async (req, res, next) => {
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

router.post("/vendor/recharge/create", requireAuth, requireRole("VENDOR"), async (req, res, next) => {
  try {
    const { amountPaise } = rechargeSchema.parse(req.body);
    const v = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!v) throw new HttpError(404, "Vendor not found");
    const rz = getRazorpay();
    if (!rz) throw new HttpError(503, "Payment gateway not configured");
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `vrc_${v.id.slice(0, 8)}_${Date.now()}`,
      notes: { vendorId: v.id, kind: "VENDOR_WALLET_RECHARGE" },
    });
    res.json({
      razorpayOrderId: order.id,
      amount: amountPaise,
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/vendor/recharge/confirm", requireAuth, requireRole("VENDOR"), async (req, res, next) => {
  try {
    const body = confirmSchema.parse(req.body);
    const v = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!v) throw new HttpError(404, "Vendor not found");
    const valid = verifyRazorpaySignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
    if (!valid) throw new HttpError(400, "Invalid signature");
    const rz = getRazorpay();
    if (!rz) throw new HttpError(503, "Payment gateway not configured");
    const payment = await rz.payments.fetch(body.razorpayPaymentId);
    const amountPaise = typeof payment.amount === "number"
      ? payment.amount
      : parseInt(String(payment.amount), 10);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0)
      throw new HttpError(400, "Invalid payment amount");
    if (payment.status !== "captured" && payment.status !== "authorized")
      throw new HttpError(400, `Payment not captured (status: ${payment.status})`);

    // Atomic dedupe via PaymentDedup — see /recharge/confirm above.
    const vendorId = v.id;
    const paymentRef = body.razorpayPaymentId;
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        await tx.paymentDedup.create({
          data: {
            paymentRef,
            kind: "WALLET_RECHARGE_VENDOR",
            consumerId: vendorId,
            amountPaise,
          },
        });
        return creditVendorWallet(
          vendorId,
          { amountPaise, reason: "RECHARGE", ref: paymentRef, note: "Razorpay vendor recharge" },
          tx,
        );
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        const existing = await prisma.paymentDedup.findUnique({ where: { paymentRef } });
        if (!existing) throw e;
        if (existing.kind !== "WALLET_RECHARGE_VENDOR" || existing.consumerId !== vendorId)
          throw new HttpError(400, "Payment already consumed by another flow");
        const prior = await prisma.walletTransaction.findFirst({
          where: { ref: paymentRef, vendorId },
          orderBy: { createdAt: "desc" },
        });
        if (!prior) throw new HttpError(500, "Inconsistent dedup state");
        result = prior;
      } else {
        throw e;
      }
    }
    res.json({ transaction: result });
  } catch (e) {
    next(e);
  }
});

router.post("/vendor/recharge", requireAuth, requireRole("VENDOR"), async (req, res, next) => {
  try {
    if (IS_PROD)
      throw new HttpError(
        403,
        "Use /wallet/vendor/recharge/create and /wallet/vendor/recharge/confirm in production",
      );
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
