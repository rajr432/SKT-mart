import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { audit } from "../lib/audit";
import { creditUserWallet } from "../lib/wallet";
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

router.get("/users", async (req, res, next) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const role = req.query.role as string | undefined;
    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
    if (role && ["CUSTOMER", "VENDOR", "ADMIN"].includes(role)) where.role = role;
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        walletBalance: true,
        loyaltyPoints: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        vendor: { select: { storeName: true, status: true } },
        _count: { select: { orders: true, addresses: true, reviews: true } },
      },
      take: 500,
    });
    res.json({ items: users });
  } catch (e) {
    next(e);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        vendor: true,
        orders: {
          orderBy: { placedAt: "desc" },
          take: 50,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            paymentStatus: true,
            paymentMethod: true,
            placedAt: true,
          },
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, type: true, title: true, createdAt: true, read: true },
        },
        _count: { select: { orders: true, reviews: true, returns: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const [walletTxns, totalSpent] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.order.aggregate({
        where: { userId: user.id, paymentStatus: "PAID" },
        _sum: { total: true },
      }),
    ]);
    res.json({
      user: { ...user, password: undefined },
      walletTxns,
      totalSpent: totalSpent._sum.total ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/vendors", async (req, res, next) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { storeName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q } } },
      ];
    }
    if (status && ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"].includes(status))
      where.status = status;
    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        },
        _count: { select: { products: true, orderItems: true } },
      },
      take: 500,
    });
    res.json({ items: vendors });
  } catch (e) {
    next(e);
  }
});

router.get("/vendors/:id", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        products: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            published: true,
            views: true,
            createdAt: true,
          },
        },
        _count: { select: { products: true, orderItems: true } },
      },
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    const [earnings, delivered, payouts] = await Promise.all([
      prisma.orderItem.aggregate({
        where: { vendorId: vendor.id, status: "DELIVERED" },
        _sum: { vendorEarn: true, price: true },
        _count: true,
      }),
      prisma.orderItem.aggregate({
        where: { vendorId: vendor.id, status: "DELIVERED" },
        _sum: { quantity: true },
      }),
      prisma.payout.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    res.json({
      vendor: { ...vendor, user: { ...vendor.user, password: undefined } },
      stats: {
        deliveredItems: earnings._count,
        unitsSold: delivered._sum.quantity ?? 0,
        grossRevenue: earnings._sum.price ?? 0,
        netEarnings: earnings._sum.vendorEarn ?? 0,
      },
      payouts,
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = z
      .object({ role: z.enum(["CUSTOMER", "VENDOR", "ADMIN"]) })
      .parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, role: true },
    });
    await audit(
      req.user!.sub,
      "USER_ROLE_CHANGED",
      "User",
      req.params.id,
      { role },
    );
    res.json({ user });
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

router.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { slug: true } },
            vendor: { select: { storeName: true } },
          },
        },
        address: true,
        payment: true,
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

// Admin forward-progress status updates only. CANCELLED and RETURNED are
// terminal/side-effectful states that require stock restocking, coupon slot
// release, and (for WALLET/Razorpay-paid orders) a refund. Those must go
// through POST /admin/orders/:id/cancel to guarantee the customer is made
// whole — see customer cancel flow in orders.ts for the canonical sequence.
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
        ]),
      })
      .parse(req.body);
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    await audit(req.user!.sub, "ORDER_STATUS_CHANGED", "Order", req.params.id, { status });
    res.json({ order });
  } catch (e) {
    next(e);
  }
});

// Admin cancel — atomically: restock items, decrement coupon usedCount, refund
// wallet if order was paid. Mirrors the customer cancel flow in orders.ts.
router.post("/orders/:id/cancel", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Order not found");
    if (["CANCELLED", "RETURNED", "DELIVERED"].includes(order.status))
      throw new HttpError(400, `Order is already ${order.status.toLowerCase()}`);
    const updated = await prisma.$transaction(async (tx) => {
      const claim = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { notIn: ["CANCELLED", "RETURNED", "DELIVERED"] },
        },
        data: { status: "CANCELLED" },
      });
      if (claim.count === 0)
        throw new HttpError(400, "Order already finalised, cannot cancel");
      const o = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true },
      });
      // Restock only items that haven't already been cancelled/returned (their
      // stock was never decremented again or is already accounted for).
      for (const it of o.items) {
        if (it.status === "CANCELLED" || it.status === "RETURNED") continue;
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
      }
      if (o.couponCode) {
        await tx.$executeRawUnsafe(
          `UPDATE "Coupon" SET "usedCount" = "usedCount" - 1 WHERE code = $1 AND "usedCount" > 0`,
          o.couponCode,
        );
      }
      if (o.paymentStatus === "PAID") {
        await creditUserWallet(
          o.userId,
          {
            amountPaise: o.total,
            reason: "REFUND",
            ref: o.id,
            note: `Admin-initiated refund for cancelled order ${o.orderNumber}`,
          },
          tx,
        );
        return tx.order.update({
          where: { id: o.id },
          data: { paymentStatus: "REFUNDED" },
          include: { items: true },
        });
      }
      return o;
    });
    await audit(req.user!.sub, "ORDER_CANCELLED_BY_ADMIN", "Order", req.params.id, {
      refunded: updated.paymentStatus === "REFUNDED",
    });
    res.json({ order: updated });
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

// Bulk publish/unpublish — accepts an array of product IDs and a target state.
// MUST be registered BEFORE the parameterized "/products/:id" route, otherwise
// Express matches ":id" = "bulk" first and this handler becomes unreachable.
router.patch("/products/bulk/publish", async (req, res, next) => {
  try {
    const { ids, published } = z
      .object({ ids: z.array(z.string()).min(1), published: z.boolean() })
      .parse(req.body);
    const r = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { published },
    });
    res.json({ count: r.count });
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

// Hard-delete a product. Cascades to images/reviews/cartItems via schema FKs;
// orderItems retain a denormalized name+price snapshot so historical orders
// stay intact even after the product row is removed.
router.delete("/products/:id", async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
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

// ============ ANALYTICS ============

router.get("/analytics", async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [orders, revenue, topProducts, topVendors, commissionSum] = await Promise.all([
      prisma.order.count({ where: { placedAt: { gte: since } } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { placedAt: { gte: since }, paymentStatus: "PAID" },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
        where: { order: { placedAt: { gte: since } } },
      }),
      prisma.orderItem.groupBy({
        by: ["vendorId"],
        _sum: { price: true, commission: true },
        orderBy: { _sum: { price: "desc" } },
        take: 10,
        where: { order: { placedAt: { gte: since } } },
      }),
      prisma.commission.aggregate({
        _sum: { amountPaise: true },
        where: { createdAt: { gte: since } },
      }),
    ]);

    // Daily GMV time series
    const daily = await prisma.$queryRawUnsafe<Array<{ d: Date; total: bigint; orders: bigint }>>(
      `SELECT date_trunc('day', "placedAt") as d, SUM(total)::bigint as total, COUNT(*)::bigint as orders
       FROM "Order" WHERE "placedAt" >= $1 AND "paymentStatus" = 'PAID' GROUP BY d ORDER BY d ASC`,
      since,
    );

    const topProductsHydrated = await prisma.product.findMany({
      where: { id: { in: topProducts.map((t) => t.productId) } },
      select: { id: true, name: true, slug: true },
    });
    const topVendorsHydrated = await prisma.vendor.findMany({
      where: { id: { in: topVendors.map((t) => t.vendorId) } },
      select: { id: true, storeName: true, slug: true },
    });

    res.json({
      days,
      orders,
      gmv: revenue._sum.total ?? 0,
      commission: commissionSum._sum.amountPaise ?? 0,
      daily: daily.map((d) => ({
        date: d.d,
        total: Number(d.total),
        orders: Number(d.orders),
      })),
      topProducts: topProducts.map((t) => ({
        ...t,
        product: topProductsHydrated.find((p) => p.id === t.productId),
      })),
      topVendors: topVendors.map((t) => ({
        ...t,
        vendor: topVendorsHydrated.find((v) => v.id === t.vendorId),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ============ EXPORTS ============

// Proper RFC-4180 escaping + Excel/Sheets formula-injection guard. Fields
// starting with =,+,-,@,\t,\r are prefixed with `'` so spreadsheet apps
// render them as text instead of evaluating them as formulas.
const csvCell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};
const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");

router.get("/export/orders.csv", async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true, items: true },
      orderBy: { placedAt: "desc" },
      take: 5000,
    });
    const rows = [
      csvRow(["orderNumber", "date", "customer", "email", "total", "status", "paymentStatus", "items"]),
      ...orders.map((o) =>
        csvRow([
          o.orderNumber,
          o.placedAt.toISOString(),
          o.user.name,
          o.user.email ?? "",
          (o.total / 100).toFixed(2),
          o.status,
          o.paymentStatus,
          o.items.length,
        ]),
      ),
    ].join("\r\n");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="orders.csv"');
    res.send(rows);
  } catch (e) {
    next(e);
  }
});

// ============ BRANDS / TAX ============

router.get("/brands", async (_req, res, next) => {
  try {
    res.json({ items: await prisma.brand.findMany({ orderBy: { name: "asc" } }) });
  } catch (e) {
    next(e);
  }
});

router.post("/brands", async (req, res, next) => {
  try {
    const data = z.object({ name: z.string().min(2), slug: z.string().min(2), logo: z.string().optional() }).parse(req.body);
    const b = await prisma.brand.create({ data });
    await audit(req.user!.sub, "BRAND_CREATE", "Brand", b.id, data);
    res.status(201).json({ brand: b });
  } catch (e) {
    next(e);
  }
});

router.patch("/brands/:id", async (req, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        logo: z.string().nullable().optional(),
        featured: z.boolean().optional(),
      })
      .parse(req.body);
    const b = await prisma.brand.update({ where: { id: req.params.id }, data });
    await audit(req.user!.sub, "BRAND_UPDATE", "Brand", b.id, data);
    res.json({ brand: b });
  } catch (e) {
    next(e);
  }
});

router.delete("/brands/:id", async (req, res, next) => {
  try {
    await prisma.brand.delete({ where: { id: req.params.id } });
    await audit(req.user!.sub, "BRAND_DELETE", "Brand", req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/tax-rates", async (_req, res, next) => {
  try {
    res.json({ items: await prisma.taxRate.findMany() });
  } catch (e) {
    next(e);
  }
});

router.post("/tax-rates", async (req, res, next) => {
  try {
    const data = z
      .object({
        hsnCode: z.string(),
        description: z.string(),
        cgst: z.number(),
        sgst: z.number(),
        igst: z.number(),
      })
      .parse(req.body);
    const t = await prisma.taxRate.upsert({
      where: { hsnCode: data.hsnCode },
      update: data,
      create: data,
    });
    res.json({ taxRate: t });
  } catch (e) {
    next(e);
  }
});

// ============ AUDIT LOG ============

router.get("/audit-log", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const items = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { name: true, email: true, role: true } } },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
