import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getRazorpay, verifyRazorpaySignature } from "../lib/razorpay";
import {
  awardOrderRewardsInTx,
  notifyReferrerAfterCommit,
} from "../lib/rewards";
import { HttpError } from "../middleware/error";

const router = Router();

router.post("/razorpay/create", requireAuth, async (req, res, next) => {
  try {
    const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== req.user!.sub) throw new HttpError(404, "Order not found");

    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({
        error: "Razorpay not configured",
        hint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env",
      });
      return;
    }

    const rzpOrder = await rzp.orders.create({
      amount: order.total,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order.id, userId: order.userId },
    });

    await prisma.payment.update({
      where: { orderId: order.id },
      data: { razorpayOrderId: rzpOrder.id, method: "RAZORPAY" },
    });

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/razorpay/verify", requireAuth, async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = z
      .object({
        orderId: z.string(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
      .parse(req.body);

    const ok = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!ok) throw new HttpError(400, "Invalid signature");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || order.userId !== req.user!.sub) throw new HttpError(404, "Order not found");

    // Signature-only verification is insufficient: a Razorpay signature
    // is valid for ANY (razorpayOrderId, razorpayPaymentId) pair Razorpay
    // actually issued to this merchant — including small legitimate ones
    // the attacker owns (e.g. a ₹100 wallet recharge). Without the two
    // checks below, they could submit that valid signature against a
    // high-value internal orderId and flip it to PAID without paying.
    //
    //   (1) razorpayOrderId must match the one we stored when /razorpay/
    //       create was called for THIS internal order. That binds the
    //       verify call to the specific Razorpay order we opened.
    //   (2) the captured Razorpay payment amount must match our order
    //       total. A mismatch means the customer paid less than the order
    //       is worth (or for a different order entirely).
    if (
      !order.payment?.razorpayOrderId ||
      order.payment.razorpayOrderId !== razorpayOrderId
    ) {
      throw new HttpError(400, "Razorpay order ID mismatch");
    }
    const rzp = getRazorpay();
    if (rzp) {
      try {
        const rzPayment = await rzp.payments.fetch(razorpayPaymentId);
        // Amount is in paise (matches our Int storage). Statuses "captured"
        // and "authorized" both represent money collected by Razorpay; we
        // accept either, but reject "created"/"failed"/"refunded" etc.
        const status = String(rzPayment.status ?? "");
        if (status !== "captured" && status !== "authorized") {
          throw new HttpError(400, `Razorpay payment not captured (${status})`);
        }
        const amountPaise =
          typeof rzPayment.amount === "number"
            ? rzPayment.amount
            : Number(rzPayment.amount);
        if (!Number.isFinite(amountPaise) || amountPaise < order.total) {
          throw new HttpError(400, "Razorpay payment amount mismatch");
        }
        // Also cross-check Razorpay's own order_id to be defensive.
        if (rzPayment.order_id !== razorpayOrderId) {
          throw new HttpError(400, "Razorpay payment / order binding mismatch");
        }
      } catch (fetchErr) {
        if (fetchErr instanceof HttpError) throw fetchErr;
        // Fetch failed for a non-HttpError reason (network, 5xx, etc.).
        // Treat as unverifiable and reject — better than admitting a payment
        // we can't confirm. The client can retry.
        console.error("[razorpay] payments.fetch failed:", fetchErr);
        throw new HttpError(502, "Could not verify payment with Razorpay");
      }
    }

    // A late Razorpay callback must NOT re-open an order the customer already
    // cancelled (stock was restocked by cancel; re-confirming would desync
    // inventory and charge the customer for nothing). Guard via updateMany
    // with a terminal-state exclusion; if 0 rows match, refund the payment.
    //
    // Award loyalty + referral INSIDE this tx (via awardOrderRewardsInTx)
    // so they commit atomically with the PAID transition. The cancel path's
    // clawback then either sees these rows and reverses them, or our CAS
    // here fails because cancel already flipped status — no window where a
    // cancelled order keeps rewards.
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { notIn: ["CANCELLED", "RETURNED", "DELIVERED"] },
          paymentStatus: { not: "PAID" },
        },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      });
      if (updated.count === 0) {
        return { reopened: false, notifyPayload: null };
      }
      await tx.payment.update({
        where: { orderId },
        data: { status: "PAID", razorpayPaymentId, razorpaySignature },
      });
      const notifyPayload = await awardOrderRewardsInTx(tx, orderId);
      return { reopened: true, notifyPayload };
    });

    if (!result.reopened) {
      throw new HttpError(
        409,
        "Order is already cancelled or finalised — payment cannot be applied. Contact support for a refund.",
      );
    }

    notifyReferrerAfterCommit(result.notifyPayload);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
