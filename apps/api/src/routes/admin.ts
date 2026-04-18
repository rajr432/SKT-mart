import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", async (_req, res, next) => {
  try {
    const [users, vendors, products, orders, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: "PAID" },
      }),
    ]);
    res.json({
      users,
      vendors,
      products,
      orders,
      revenue: revenue._sum.total ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        vendor: { select: { storeName: true, status: true } },
      },
    });
    res.json({ items: users });
  } catch (e) {
    next(e);
  }
});

router.get("/vendors", async (_req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    res.json({ items: vendors });
  } catch (e) {
    next(e);
  }
});

router.patch("/vendors/:id/status", async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]) })
      .parse(req.body);
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ vendor });
  } catch (e) {
    next(e);
  }
});

router.get("/orders", async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        address: true,
        payment: true,
      },
      take: 200,
    });
    res.json({ items: orders });
  } catch (e) {
    next(e);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { status } = z
      .object({
        status: z.enum([
          "PLACED",
          "CONFIRMED",
          "PACKED",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "RETURNED",
        ]),
      })
      .parse(req.body);
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

router.get("/products", async (_req, res, next) => {
  try {
    const items = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { vendor: { select: { storeName: true } }, category: true, images: { take: 1 } },
      take: 200,
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const { published } = z.object({ published: z.boolean() }).parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { published },
    });
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

const bannerSchema = z.object({
  title: z.string(),
  image: z.string(),
  link: z.string().optional(),
  position: z.number().int().default(0),
  active: z.boolean().default(true),
});

router.get("/banners", async (_req, res, next) => {
  try {
    const items = await prisma.banner.findMany({ orderBy: { position: "asc" } });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/banners", async (req, res, next) => {
  try {
    const data = bannerSchema.parse(req.body);
    const banner = await prisma.banner.create({ data });
    res.status(201).json({ banner });
  } catch (e) {
    next(e);
  }
});

router.patch("/banners/:id", async (req, res, next) => {
  try {
    const data = bannerSchema.partial().parse(req.body);
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json({ banner });
  } catch (e) {
    next(e);
  }
});

router.delete("/banners/:id", async (req, res, next) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
});

router.post("/categories", async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json({ category });
  } catch (e) {
    next(e);
  }
});

router.patch("/categories/:id", async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json({ category });
  } catch (e) {
    next(e);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

const couponSchema = z.object({
  code: z.string().min(3),
  title: z.string(),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.number().int().positive(),
  minOrder: z.number().int().default(0),
  maxDiscount: z.number().int().optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
  usageLimit: z.number().int().optional(),
});

router.post("/coupons", async (req, res, next) => {
  try {
    const data = couponSchema.parse(req.body);
    const coupon = await prisma.coupon.create({
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
    res.status(201).json({ coupon });
  } catch (e) {
    next(e);
  }
});

router.get("/coupons", async (_req, res, next) => {
  try {
    const items = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.delete("/coupons/:id", async (req, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/pincodes", async (req, res, next) => {
  try {
    const data = z
      .object({
        pincode: z.string().length(6),
        city: z.string(),
        state: z.string(),
        serviceable: z.boolean().default(true),
        codAvailable: z.boolean().default(true),
        etaDays: z.number().int().default(5),
      })
      .parse(req.body);
    const p = await prisma.pincode.upsert({
      where: { pincode: data.pincode },
      update: data,
      create: data,
    });
    res.json({ pincode: p });
  } catch (e) {
    next(e);
  }
});

export default router;
