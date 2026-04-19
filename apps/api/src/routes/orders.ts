import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { computePrice } from "../lib/pricing";
import { generateOrderNumber } from "../lib/order";
import { computeCommission } from "../lib/commission";
import { notify } from "../lib/notify";
import { creditUserWallet } from "../lib/wallet";
import { getSettings } from "../lib/settings";

const router = Router();

const placeOrderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["RAZORPAY", "UPI", "CARD", "NETBANKING", "WALLET"]).default("RAZORPAY"),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = placeOrderSchema.parse(req.body);
    const userId = req.user!.sub;

    const [cartItems, address] = await Promise.all([
      prisma.cartItem.findMany({ where: { userId }, include: { product: true } }),
      prisma.address.findFirst({ where: { id: body.addressId, userId } }),
    ]);

    if (cartItems.length === 0) throw new HttpError(400, "Cart is empty");
    if (!address) throw new HttpError(404, "Address not found");

    for (const ci of cartItems) {
      if (ci.product.stock < ci.quantity) {
        throw new HttpError(400, `Out of stock: ${ci.product.name}`);
      }
    }

    const breakup = await computePrice(
      cartItems.map((c) => ({
        productId: c.productId,
        price: c.product.price,
        mrp: c.product.mrp,
        quantity: c.quantity,
      })),
      body.couponCode,
      address.pincode,
    );

    // Pre-compute commission per line item (uses settings & vendor override)
    const itemCommissions = await Promise.all(
      cartItems.map(async (ci) => {
        const c = await computeCommission(ci.product.price, ci.quantity, ci.product.vendorId);
        return {
          ci,
          commission: c.amountPaise,
          vendorEarn: c.basePaise - c.amountPaise,
          percent: c.percent,
          basePaise: c.basePaise,
        };
      }),
    );

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: address.id,
          subtotal: breakup.subtotal,
          discount: breakup.discount + breakup.couponDiscount,
          shippingFee: breakup.shippingFee,
          tax: breakup.tax,
          total: breakup.total,
          paymentMethod: body.paymentMethod,
          couponCode: body.couponCode,
          notes: body.notes,
          items: {
            create: itemCommissions.map(({ ci, commission, vendorEarn }) => ({
              productId: ci.productId,
              vendorId: ci.product.vendorId,
              name: ci.product.name,
              price: ci.product.price,
              quantity: ci.quantity,
              commission,
              vendorEarn,
            })),
          },
          payment: {
            create: {
              amount: breakup.total,
              method: body.paymentMethod,
              status: "PENDING",
            },
          },
        },
        include: { items: true, payment: true, address: true },
      });

      // Create commission ledger entries
      for (const it of created.items) {
        const ic = itemCommissions.find((x) => x.ci.productId === it.productId);
        if (!ic) continue;
        await tx.commission.create({
          data: {
            orderItemId: it.id,
            vendorId: it.vendorId,
            amountPaise: ic.commission,
            percent: ic.percent,
            basePaise: ic.basePaise,
          },
        });
      }

      for (const ci of cartItems) {
        await tx.product.update({
          where: { id: ci.productId },
          data: { stock: { decrement: ci.quantity } },
        });
      }
      await tx.cartItem.deleteMany({ where: { userId } });

      if (body.couponCode) {
        await tx.coupon.updateMany({
          where: { code: body.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    // Respond immediately: the order is already committed. Any failure in the
    // post-commit side-effects below (loyalty, referral, notify) must NOT turn
    // a committed order into a 500, because the client would retry and place a
    // duplicate order.
    res.status(201).json({ order });

    // Post-commit side-effects. Errors are logged but never re-thrown.
    try {
      const settings = await getSettings();
      // Award loyalty points (1 coin per ₹100 spent). breakup.total is in paise,
      // so ₹100 = 10000 paise. settings.loyaltyEarnPer100 is coins earned per ₹100.
      const points = Math.floor(breakup.total / 10000) * settings.loyaltyEarnPer100;
      if (points > 0) {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: points } },
          select: { loyaltyPoints: true },
        });
        await prisma.loyaltyTransaction.create({
          data: {
            userId,
            points,
            reason: "ORDER_EARN",
            ref: order.id,
            balanceAfter: updated.loyaltyPoints,
          },
        });
      }

      // Referral bonus on first order
      const userOrderCount = await prisma.order.count({ where: { userId } });
      if (userOrderCount === 1) {
        const u = await prisma.user.findUnique({ where: { id: userId } });
        if (u?.referredById) {
          await creditUserWallet(u.referredById, {
            amountPaise: settings.referralBonusPaise,
            reason: "REFERRAL",
            ref: order.id,
            note: `Referral bonus from ${u.name}`,
          });
          await notify(
            u.referredById,
            "WALLET",
            "Referral bonus credited!",
            `\u20B9${(settings.referralBonusPaise / 100).toFixed(0)} added to your wallet.`,
            "/account",
          );
        }
      }

      await notify(
        userId,
        "ORDER",
        `Order placed: ${order.orderNumber}`,
        `Your order has been placed successfully.`,
        `/orders/${order.id}`,
      );
    } catch (sideEffectErr) {
      console.error(`[orders] post-commit side-effects failed for order ${order.id}`, sideEffectErr);
    }
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.sub },
      include: { items: true, address: true, payment: true },
      orderBy: { placedAt: "desc" },
    });
    res.json({ items: orders });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        address: true,
        payment: true,
      },
    });
    if (!order || order.userId !== req.user!.sub) throw new HttpError(404, "Order not found");
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.userId !== req.user!.sub) throw new HttpError(404, "Order not found");
    if (!["PLACED", "CONFIRMED"].includes(order.status))
      throw new HttpError(400, "Order cannot be cancelled at this stage");
    // Cancel + restock + refund must all land together. If any step fails
    // (e.g. wallet credit throws), the whole tx rolls back — otherwise a paid
    // cancel could end up with status=CANCELLED, stock restored, and no refund
    // issued, with the cancel-guard above blocking any retry.
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
        include: { items: true },
      });
      // restock
      for (const it of o.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
      }
      if (order.paymentStatus === "PAID") {
        await creditUserWallet(
          order.userId,
          {
            amountPaise: order.total,
            reason: "REFUND",
            ref: order.id,
            note: `Refund for cancelled order ${order.orderNumber}`,
          },
          tx,
        );
        // Apply the paymentStatus flip and return that row so the response
        // reflects the final state; otherwise the client would see a stale
        // `paymentStatus: "PAID"` until the next refresh.
        return tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: "REFUNDED" },
          include: { items: true },
        });
      }
      return o;
    });
    res.json({ order: updated });
    // Best-effort notification — must not turn a committed cancel into a 500.
    try {
      await notify(order.userId, "ORDER", `Order cancelled`, `Order ${order.orderNumber} has been cancelled.`, `/orders/${order.id}`);
    } catch (notifyErr) {
      console.error(`[orders] notify failed for cancel ${order.id}`, notifyErr);
    }
  } catch (e) {
    next(e);
  }
});

export default router;
