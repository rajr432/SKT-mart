import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
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
    // Global dedupe across ALL wallet contexts + vendor-registration refs.
    // Scoped-by-userId alone let a user-who-is-also-a-vendor replay the
    // same (orderId, paymentId, signature) against the user-wallet and
    // vendor-wallet endpoints to double-credit themselves. Mirror the
    // pattern used in vendor.ts registration confirm.
    const [dup, dupVendor] = await Promise.all([
      prisma.walletTransaction.findFirst({ where: { ref: body.razorpayPaymentId } }),
      prisma.vendor.findFirst({ where: { registrationPaymentRef: body.razorpayPaymentId } }),
    ]);
    if (dup && dup.userId === req.user!.sub) return res.json({ transaction: dup });
    if (dup || dupVendor) throw new HttpError(400, "Payment already consumed");
    // Fetch amount from Razorpay to avoid client tampering
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
    const txn = await creditUserWallet(req.user!.sub, {
      amountPaise,
      reason: "RECHARGE",
      ref: body.razorpayPaymentId,
      note: "Razorpay recharge",
    });
    await audit(req.user!.sub, "WALLET_RECHARGE", "User", req.user!.sub, {
      amountPaise,
      paymentId: body.razorpayPaymentId,
    });
    res.json({ transaction: txn });
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

router.post("/vendor/recharge/create", requireAuth, async (req, res, next) => {
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

router.post("/vendor/recharge/confirm", requireAuth, async (req, res, next) => {
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
    // Global dedupe — see comment in /recharge/confirm above. Prevents
    // cross-context replay (user wallet → vendor wallet, or either to
    // vendor registration fee).
    const [dup, dupVendorReg] = await Promise.all([
      prisma.walletTransaction.findFirst({ where: { ref: body.razorpayPaymentId } }),
      prisma.vendor.findFirst({ where: { registrationPaymentRef: body.razorpayPaymentId } }),
    ]);
    if (dup && dup.vendorId === v.id) return res.json({ transaction: dup });
    if (dup || dupVendorReg) throw new HttpError(400, "Payment already consumed");
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
    const txn = await creditVendorWallet(v.id, {
      amountPaise,
      reason: "RECHARGE",
      ref: body.razorpayPaymentId,
      note: "Razorpay vendor recharge",
    });
    res.json({ transaction: txn });
  } catch (e) {
    next(e);
  }
});

router.post("/vendor/recharge", requireAuth, async (req, res, next) => {
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
