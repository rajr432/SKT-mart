import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { computePrice } from "../lib/pricing";
import { generateOrderNumber } from "../lib/order";

const router = Router();

const placeOrderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["COD", "RAZORPAY", "UPI", "CARD", "NETBANKING"]).default("COD"),
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
            create: cartItems.map((ci) => ({
              productId: ci.productId,
              vendorId: ci.product.vendorId,
              name: ci.product.name,
              price: ci.product.price,
              quantity: ci.quantity,
            })),
          },
          payment: {
            create: {
              amount: breakup.total,
              method: body.paymentMethod,
              status: body.paymentMethod === "COD" ? "PENDING" : "PENDING",
            },
          },
        },
        include: { items: true, payment: true, address: true },
      });

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

    res.status(201).json({ order });
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
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    res.json({ order: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
