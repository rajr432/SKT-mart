import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { computePrice } from "../lib/pricing";
import { generateOrderNumber } from "../lib/order";
import { computeCommission } from "../lib/commission";
import { notify } from "../lib/notify";
import { creditUserWallet, debitUserWallet } from "../lib/wallet";
import { getSettings } from "../lib/settings";
import { sendWhatsApp } from "../lib/whatsapp";
import { sendPushToUser } from "../lib/push";

const router = Router();

const placeOrderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["RAZORPAY", "UPI", "CARD", "NETBANKING", "WALLET"]).default("RAZORPAY"),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

// Price preview — same engine as /orders POST, no side-effects. Frontend
// checkout calls this so the displayed total matches what will be charged
// (coupon-aware tax + shipping threshold).
router.post(
  "/preview",
  requireAuth,
  async (req, res, next) => {
    try {
      const body = z
        .object({ couponCode: z.string().optional(), pincode: z.string().optional() })
        .parse(req.body ?? {});
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: req.user!.sub },
        include: { product: true },
      });
      if (cartItems.length === 0) {
        return res.json({
          subtotal: 0,
          discount: 0,
          couponDiscount: 0,
          shippingFee: 0,
          tax: 0,
          total: 0,
        });
      }
      const breakup = await computePrice(
        cartItems.map((c) => ({
          productId: c.productId,
          price: c.product.price,
          mrp: c.product.mrp,
          quantity: c.quantity,
        })),
        body.couponCode,
        body.pincode,
      );
      res.json(breakup);
    } catch (e) {
      next(e);
    }
  },
);

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

    const order = await prisma.$transaction(async (tx): Promise<Awaited<ReturnType<typeof tx.order.create>>> => {
      const isWallet = body.paymentMethod === "WALLET";
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
          paymentStatus: isWallet ? "PAID" : "PENDING",
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
              status: isWallet ? "PAID" : "PENDING",
            },
          },
        },
        include: { items: true, payment: true, address: true },
      });

      // WALLET method: atomically debit user wallet. If insufficient, the
      // tx rolls back and the order is never created — caller sees 400.
      if (isWallet) {
        await debitUserWallet(
          userId,
          {
            amountPaise: breakup.total,
            reason: "PURCHASE",
            ref: created.id,
            note: `Order ${created.orderNumber}`,
          },
          tx,
        );
      }

      // Create commission ledger entries. Match each saved OrderItem back to
      // its precomputed commission via a Map keyed by (productId, quantity,
      // price) — unique per line because cart has @@unique([userId,productId])
      // and the quantity/price snapshot is copied verbatim. This is more
      // robust than `find(x => x.ci.productId === it.productId)` if the
      // schema ever grows to allow multiple cart rows per product (variants).
      const commissionByKey = new Map(
        itemCommissions.map((ic) => [
          `${ic.ci.productId}:${ic.ci.quantity}:${ic.ci.product.price}`,
          ic,
        ]),
      );
      for (const it of created.items) {
        const ic = commissionByKey.get(`${it.productId}:${it.quantity}:${it.price}`);
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

      // Race-safe stock decrement: conditional updateMany with `stock >= qty`
      // guard. Two concurrent orders on the same last-1 item cannot both
      // succeed — the loser sees count===0, throws, and the whole order tx
      // rolls back (no partial order, no negative stock).
      for (const ci of cartItems) {
        const claim = await tx.product.updateMany({
          where: { id: ci.productId, stock: { gte: ci.quantity } },
          data: { stock: { decrement: ci.quantity } },
        });
        if (claim.count === 0) {
          throw new HttpError(400, `Out of stock: ${ci.product.name}`);
        }
      }
      await tx.cartItem.deleteMany({ where: { userId } });

      if (body.couponCode) {
        // Race-safe usage-limit consumption via raw SQL conditional update.
        // Prisma's updateMany cannot reference another column in WHERE
        // (`usedCount < usageLimit`), so we use executeRawUnsafe. Two
        // concurrent orders with a limited coupon (e.g. usageLimit=1) would
        // otherwise both pass the pre-tx check in computePrice and both
        // increment usedCount — bypassing the cap. Here the UPDATE only
        // succeeds when the coupon is still within limit (or unlimited).
        const affected = await tx.$executeRawUnsafe<number>(
          `UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
           WHERE code = $1 AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`,
          body.couponCode,
        );
        if (!affected) {
          throw new HttpError(400, "Coupon usage limit reached");
        }
      }

      return created;
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "Insufficient wallet balance") {
        throw new HttpError(400, "Insufficient wallet balance for this order");
      }
      throw e;
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

      // Web push to buyer (best-effort, no-op if VAPID not configured)
      void sendPushToUser(userId, {
        title: `Order placed: ${order.orderNumber}`,
        body: `Your order of ₹${(order.total / 100).toFixed(0)} has been received.`,
        url: `/orders/${order.id}`,
      });

      // Notify each vendor whose items are in this order over WhatsApp +
      // in-app + push + email. Grouped by vendor so each vendor sees
      // only their own items. Refetch with includes so relation types
      // survive the $transaction return-type narrowing.
      const full = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true, address: true },
      });
      if (full) {
        const vendorIds: string[] = Array.from(
          new Set(full.items.map((i) => i.vendorId)),
        );
        const vendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        });
        const webUrl = process.env.WEB_URL ?? "https://sktmart.vercel.app";
        for (const v of vendors) {
          const vItems = full.items.filter((i) => i.vendorId === v.id);
          // Gross is what the customer paid for these items (before commission);
          // net is what the vendor actually earns after platform commission.
          const grossTotal = vItems.reduce((s, i) => s + i.price * i.quantity, 0);
          const netEarnings = vItems.reduce((s, i) => s + i.vendorEarn, 0);
          const lines = vItems
            .map((i) => `• ${i.name} × ${i.quantity}`)
            .join("\n");
          const msg =
            `🛒 *New order on SKT Mart*\n` +
            `Order: ${full.orderNumber}\n` +
            `Customer: ${full.address?.name ?? ""}\n` +
            `Pincode: ${full.address?.pincode ?? ""}\n\n` +
            `${lines}\n\n` +
            `Order total: ₹${(grossTotal / 100).toFixed(0)}\n` +
            `Your earnings (after commission): ₹${(netEarnings / 100).toFixed(0)}\n` +
            `Manage: ${webUrl}/vendor/orders`;
          if (v.user?.phone) void sendWhatsApp(v.user.phone, msg);
          if (v.user?.id) {
            await notify(
              v.user.id,
              "ORDER",
              `New order: ${full.orderNumber}`,
              `${vItems.length} item(s) · earnings ₹${(netEarnings / 100).toFixed(0)}.`,
              `/vendor/orders`,
            );
            void sendPushToUser(v.user.id, {
              title: `New order: ${full.orderNumber}`,
              body: `${vItems.length} item(s) · earnings ₹${(netEarnings / 100).toFixed(0)}`,
              url: `/vendor/orders`,
            });
          }
        }
      }
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
      // Race-safe status flip: only the first concurrent cancel request wins.
      const claim = await tx.order.updateMany({
        where: { id: order.id, status: { in: ["PLACED", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      });
      if (claim.count === 0)
        throw new HttpError(400, "Order cannot be cancelled at this stage");
      const o = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true },
      });
      // restock
      for (const it of o.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
      }
      // Read `paymentStatus` from the tx-fresh row (`o`), NOT the outer
      // `order` — a concurrent Razorpay webhook could have flipped
      // PENDING→PAID between the outer find and this tx, and skipping
      // the refund there would permanently lose the customer's money
      // (cancel-guard above would block any retry).
      if (o.paymentStatus === "PAID") {
        await creditUserWallet(
          o.userId,
          {
            amountPaise: o.total,
            reason: "REFUND",
            ref: o.id,
            note: `Refund for cancelled order ${o.orderNumber}`,
          },
          tx,
        );
        // Apply the paymentStatus flip and return that row so the response
        // reflects the final state; otherwise the client would see a stale
        // `paymentStatus: "PAID"` until the next refresh.
        return tx.order.update({
          where: { id: o.id },
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
