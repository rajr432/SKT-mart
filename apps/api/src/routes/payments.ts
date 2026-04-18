import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getRazorpay, verifyRazorpaySignature } from "../lib/razorpay";
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

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== req.user!.sub) throw new HttpError(404, "Order not found");

    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: { status: "PAID", razorpayPaymentId, razorpaySignature },
      }),
      prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID", status: "CONFIRMED" } }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
