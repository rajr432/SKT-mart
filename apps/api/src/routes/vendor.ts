import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { getSettings } from "../lib/settings";
import { debitUserWallet } from "../lib/wallet";
import { getRazorpay, verifyRazorpaySignature } from "../lib/razorpay";

const router = Router();

// Public-authenticated endpoint (any logged-in user can register as vendor).
// The rest of the vendor routes below require VENDOR/ADMIN role + paid reg.
router.get("/public/fee", async (_req, res, next) => {
  try {
    const s = await getSettings();
    res.json({ feePaise: s.vendorRegistrationFee });
  } catch (e) {
    next(e);
  }
});

// Allows any logged-in user (customer or pending vendor) to check their
// vendor profile + payment status without needing VENDOR role.
router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    const s = await getSettings();
    res.json({
      vendor,
      feePaise: s.vendorRegistrationFee,
      registrationPaid: vendor?.registrationPaid ?? false,
    });
  } catch (e) {
    next(e);
  }
});

const vendorSchema = z.object({
  storeName: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  logo: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
});

// Step 1: any logged-in user creates a PENDING vendor profile (unpaid).
router.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const data = vendorSchema.parse(req.body);
    const existing = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (existing) throw new HttpError(409, "Vendor profile already exists");
    const vendor = await prisma.vendor.create({
      data: { ...data, userId: req.user!.sub, status: "PENDING", registrationPaid: false },
    });
    res.status(201).json({ vendor });
  } catch (e) {
    next(e);
  }
});

// Step 2a: pay the one-time ₹199 lifetime fee via SKT wallet (instant).
router.post("/pay-registration/wallet", requireAuth, async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Apply as vendor first");
    if (vendor.registrationPaid) throw new HttpError(400, "Registration already paid");
    const s = await getSettings();
    const fee = s.vendorRegistrationFee;
    const updated = await prisma.$transaction(async (tx) => {
      const w = await debitUserWallet(
        req.user!.sub,
        { amountPaise: fee, reason: "ADJUSTMENT", ref: vendor.id, note: "Vendor registration fee" },
        tx,
      );
      const v = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          registrationPaid: true,
          registrationPaidAt: new Date(),
          registrationPaymentRef: w.id,
          status: "APPROVED",
        },
      });
      await tx.user.update({ where: { id: req.user!.sub }, data: { role: "VENDOR" } });
      return v;
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "Insufficient wallet balance")
        throw new HttpError(400, `Recharge wallet. Fee: ₹${(fee / 100).toFixed(0)}`);
      throw e;
    });
    res.json({ vendor: updated });
  } catch (e) {
    next(e);
  }
});

// Step 2b: pay via Razorpay — create order (client completes checkout)
router.post("/pay-registration/razorpay/create", requireAuth, async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Apply as vendor first");
    if (vendor.registrationPaid) throw new HttpError(400, "Registration already paid");
    const s = await getSettings();
    const rz = getRazorpay();
    const order = rz
      ? await rz.orders.create({
          amount: s.vendorRegistrationFee,
          currency: "INR",
          receipt: `vreg_${vendor.id}`,
          notes: { vendorId: vendor.id, kind: "VENDOR_REGISTRATION" },
        })
      : null;
    res.json({
      razorpayOrderId: order?.id ?? null,
      amount: s.vendorRegistrationFee,
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
    });
  } catch (e) {
    next(e);
  }
});

// Step 2c: confirm Razorpay payment & activate vendor
router.post("/pay-registration/razorpay/confirm", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      razorpayOrderId: z.string(),
      razorpayPaymentId: z.string(),
      razorpaySignature: z.string(),
    });
    const body = schema.parse(req.body);
    const valid = verifyRazorpaySignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
    if (!valid) throw new HttpError(400, "Invalid signature");
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Apply as vendor first");
    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          registrationPaid: true,
          registrationPaidAt: new Date(),
          registrationPaymentRef: body.razorpayPaymentId,
          status: "APPROVED",
        },
      });
      await tx.user.update({ where: { id: req.user!.sub }, data: { role: "VENDOR" } });
      return v;
    });
    res.json({ vendor: updated });
  } catch (e) {
    next(e);
  }
});

// ==== All following routes require VENDOR/ADMIN role AND paid registration ====
router.use(requireAuth, requireRole("VENDOR", "ADMIN"));

router.get("/me", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    res.json({ vendor });
  } catch (e) {
    next(e);
  }
});

// Back-compat alias for legacy clients
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = vendorSchema.parse(req.body);
    const existing = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (existing) throw new HttpError(409, "Vendor profile already exists");
    const vendor = await prisma.vendor.create({
      data: { ...data, userId: req.user!.sub },
    });
    res.status(201).json({ vendor });
  } catch (e) {
    next(e);
  }
});

router.patch("/me", async (req, res, next) => {
  try {
    const data = vendorSchema.partial().parse(req.body);
    const vendor = await prisma.vendor.update({
      where: { userId: req.user!.sub },
      data,
    });
    res.json({ vendor });
  } catch (e) {
    next(e);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: { images: { take: 1 }, category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items: products });
  } catch (e) {
    next(e);
  }
});

const productSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string(),
  brand: z.string().optional(),
  sku: z.string(),
  mrp: z.number().int().positive(),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  fAssured: z.boolean().default(false),
  published: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  specs: z.record(z.any()).optional(),
});

router.post("/products", async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const { images, ...rest } = data;
    const product = await prisma.product.create({
      data: {
        ...rest,
        vendorId: vendor.id,
        images: { create: images.map((url, i) => ({ url, position: i })) },
      },
      include: { images: true },
    });
    res.status(201).json({ product });
  } catch (e) {
    next(e);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.vendorId !== vendor.id)
      throw new HttpError(404, "Product not found");
    const { images, ...rest } = data;
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: images.map((url, i) => ({ url, position: i })),
              },
            }
          : {}),
      },
      include: { images: true },
    });
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.vendorId !== vendor.id)
      throw new HttpError(404, "Product not found");
    await prisma.product.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const orderItems = await prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
      include: { order: { include: { address: true, user: { select: { name: true } } } } },
      orderBy: { order: { placedAt: "desc" } },
    });
    res.json({ items: orderItems });
  } catch (e) {
    next(e);
  }
});

router.patch("/orders/:orderItemId/status", async (req, res, next) => {
  try {
    const { status } = z
      .object({
        status: z.enum(["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]),
      })
      .parse(req.body);
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const orderItem = await prisma.orderItem.findUnique({ where: { id: req.params.orderItemId } });
    if (!orderItem || orderItem.vendorId !== vendor.id)
      throw new HttpError(404, "Order item not found");
    const updated = await prisma.orderItem.update({
      where: { id: orderItem.id },
      data: { status },
    });
    res.json({ orderItem: updated });
  } catch (e) {
    next(e);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const [productCount, orderAgg, pendingOrders] = await Promise.all([
      prisma.product.count({ where: { vendorId: vendor.id } }),
      prisma.orderItem.aggregate({
        where: { vendorId: vendor.id },
        _sum: { price: true, quantity: true },
        _count: true,
      }),
      prisma.orderItem.count({
        where: { vendorId: vendor.id, status: { in: ["PLACED", "CONFIRMED"] } },
      }),
    ]);
    res.json({
      productCount,
      totalOrders: orderAgg._count,
      revenue: (orderAgg._sum.price ?? 0) * 1, // already price * 1 per item (qty not multiplied in agg)
      unitsSold: orderAgg._sum.quantity ?? 0,
      pendingOrders,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
