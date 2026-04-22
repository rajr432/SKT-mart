import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { getSettings } from "../lib/settings";
import { debitUserWallet } from "../lib/wallet";
import { getRazorpay, verifyRazorpaySignature } from "../lib/razorpay";
import { notify } from "../lib/notify";
import { sendPushToUser } from "../lib/push";
import { sendWhatsApp } from "../lib/whatsapp";

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

// Public vendor storefront — list a vendor's products by store slug. No auth
// required; used by /store/[slug] on the web. Only approved + paid vendors
// are exposed so unpaid profiles don't show up with zero products.
router.get("/public/store/:slug", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        storeName: true,
        slug: true,
        description: true,
        status: true,
        registrationPaid: true,
        createdAt: true,
      },
    });
    if (!vendor || !vendor.registrationPaid || vendor.status !== "APPROVED")
      throw new HttpError(404, "Store not found");
    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id, published: true },
      include: { images: { take: 1 }, category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    res.json({ vendor, products });
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
    const s = await getSettings();
    const fee = s.vendorRegistrationFee;
    const updated = await prisma.$transaction(async (tx) => {
      // Re-read + race-safe claim inside tx. Two concurrent calls cannot both
      // flip registrationPaid=false → true; the loser's updateMany matches 0
      // rows and aborts before the wallet debit runs.
      const vendor = await tx.vendor.findUnique({ where: { userId: req.user!.sub } });
      if (!vendor) throw new HttpError(404, "Apply as vendor first");
      if (vendor.registrationPaid) throw new HttpError(400, "Registration already paid");
      const claim = await tx.vendor.updateMany({
        where: { id: vendor.id, registrationPaid: false },
        data: {
          registrationPaid: true,
          registrationPaidAt: new Date(),
          status: "APPROVED",
        },
      });
      if (claim.count === 0) throw new HttpError(400, "Registration already paid");
      const w = await debitUserWallet(
        req.user!.sub,
        { amountPaise: fee, reason: "REGISTRATION_FEE", ref: vendor.id, note: "Vendor registration fee" },
        tx,
      );
      const v = await tx.vendor.update({
        where: { id: vendor.id },
        data: { registrationPaymentRef: w.id },
      });
      await tx.user.update({ where: { id: req.user!.sub }, data: { role: "VENDOR" } });
      return v;
    }).catch((e: unknown) => {
      if (e instanceof HttpError) throw e;
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
    // Server-authoritative amount check — client-supplied amounts are
    // unreliable. Fetch the captured/authorized amount directly from
    // Razorpay and ensure it meets the configured vendor fee.
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
    const s = await getSettings();
    if (amountPaise < s.vendorRegistrationFee)
      throw new HttpError(
        400,
        `Insufficient amount. Fee: ₹${(s.vendorRegistrationFee / 100).toFixed(0)}`,
      );
    // Two layers of atomic protection:
    //   1. PaymentDedup unique claim on paymentRef — blocks replay across
    //      any wallet/vendor-registration confirm endpoint. Pure in-tx
    //      findFirst is insufficient under READ COMMITTED (concurrent
    //      interactive txs don't observe each other's uncommitted rows).
    //   2. `updateMany({ registrationPaid: false })` CAS on Vendor —
    //      consistent with the /pay-registration/wallet path; prevents a
    //      suspended vendor from replaying to reset APPROVED, and prevents
    //      concurrent confirms on distinct paymentIds from racing on the
    //      same vendor row.
    const userId = req.user!.sub;
    const paymentRef = body.razorpayPaymentId;
    const vendorPre = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendorPre) throw new HttpError(404, "Apply as vendor first");
    if (vendorPre.registrationPaid)
      throw new HttpError(400, "Registration already paid");
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.paymentDedup.create({
          data: {
            paymentRef,
            kind: "VENDOR_REGISTRATION",
            consumerId: vendorPre.id,
            amountPaise,
          },
        });
        const claim = await tx.vendor.updateMany({
          where: { id: vendorPre.id, registrationPaid: false },
          data: {
            registrationPaid: true,
            registrationPaidAt: new Date(),
            registrationPaymentRef: paymentRef,
            status: "APPROVED",
          },
        });
        if (claim.count === 0) throw new HttpError(400, "Registration already paid");
        await tx.user.update({ where: { id: userId }, data: { role: "VENDOR" } });
        return tx.vendor.findUniqueOrThrow({ where: { id: vendorPre.id } });
      });
      res.json({ vendor: updated });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        const existing = await prisma.paymentDedup.findUnique({ where: { paymentRef } });
        if (!existing) throw e;
        if (existing.kind !== "VENDOR_REGISTRATION" || existing.consumerId !== vendorPre.id)
          throw new HttpError(400, "Payment already consumed by another flow");
        // Idempotent replay — vendor is already registered with this paymentRef.
        const v = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorPre.id } });
        res.json({ vendor: v });
        return;
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

// ==== All following routes require VENDOR/ADMIN role ====
router.use(requireAuth, requireRole("VENDOR", "ADMIN"));

// Allow a VENDOR-role user to read their own profile even if unpaid, so the
// onboarding UI can poll status. Operational routes below require a paid
// registration (enforced by the registrationPaidGuard middleware).
router.get("/me", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    res.json({ vendor });
  } catch (e) {
    next(e);
  }
});

// Enforce paid registration for all subsequent operational routes (products,
// orders, returns, etc.). ADMIN bypasses. This is the belt-and-suspenders
// check that closes the gap where a VENDOR-role user created outside the
// paid flow (e.g. legacy data, admin-minted, or a future registration bug)
// could otherwise list products and transact before paying the fee.
router.use(async (req, _res, next) => {
  try {
    if (req.user!.role === "ADMIN") return next();
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.sub },
      select: { registrationPaid: true, status: true },
    });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    if (!vendor.registrationPaid)
      throw new HttpError(402, "Vendor registration fee not paid");
    if (vendor.status === "SUSPENDED")
      throw new HttpError(403, "Vendor account suspended");
    next();
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
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: req.params.orderItemId },
      include: {
        order: { select: { id: true, userId: true, user: { select: { phone: true } } } },
      },
    });
    if (!orderItem || orderItem.vendorId !== vendor.id)
      throw new HttpError(404, "Order item not found");
    // Item update + aggregate Order.status propagation must be atomic.
    // Order.status is the minimum progression across non-CANCELLED items:
    // if every item is DELIVERED → Order=DELIVERED; if at least one is still
    // CONFIRMED → Order=CONFIRMED. This keeps (a) the customer tracker in
    // sync with vendor fulfilment progress, and (b) the cancel-guard in
    // orders.ts effective once any item ships (PACKED+ items block cancel).
    const STATUS_RANK: Record<string, number> = {
      PLACED: 0,
      CONFIRMED: 1,
      PACKED: 2,
      SHIPPED: 3,
      OUT_FOR_DELIVERY: 4,
      DELIVERED: 5,
    };
    // Forward-only transition: a vendor must not regress an item backward
    // (e.g. SHIPPED → CONFIRMED) since that would cascade into Order.status
    // regression via the min-rank aggregate below, confuse the customer
    // tracker, and re-open an already-shipped order to cancellation.
    const currentRank = STATUS_RANK[orderItem.status] ?? -1;
    const nextRank = STATUS_RANK[status];
    if (nextRank <= currentRank) {
      throw new HttpError(
        400,
        `Cannot move item from ${orderItem.status} to ${status} (forward-only)`,
      );
    }
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { status },
      });
      // Generate delivery OTP when any item goes OUT_FOR_DELIVERY and order
      // doesn't already have one. Customer must share this OTP with the
      // delivery agent to confirm receipt.
      if (status === "OUT_FOR_DELIVERY") {
        const existingOtp = await tx.order.findUnique({
          where: { id: orderItem.order.id },
          select: { deliveryOtp: true },
        });
        if (!existingOtp?.deliveryOtp) {
          const otp = String(Math.floor(1000 + Math.random() * 9000));
          await tx.order.update({
            where: { id: orderItem.order.id },
            data: { deliveryOtp: otp },
          });
        }
      }
      const siblings = await tx.orderItem.findMany({
        where: { orderId: orderItem.order.id, status: { notIn: ["CANCELLED", "RETURNED"] } },
        select: { status: true },
      });
      if (siblings.length > 0) {
        let minRank = Infinity;
        let minStatus: string = "PLACED";
        for (const s of siblings) {
          const r = STATUS_RANK[s.status];
          if (r === undefined) continue;
          if (r < minRank) {
            minRank = r;
            minStatus = s.status;
          }
        }
        // Only advance forward — never regress Order.status below its current
        // value (e.g. a CANCELLED order or already-DELIVERED order must not be
        // re-opened by this aggregate). Also don't overwrite terminal states.
        await tx.order.updateMany({
          where: {
            id: orderItem.order.id,
            status: { notIn: ["CANCELLED", "RETURNED"] },
          },
          data: { status: minStatus as never },
        });
      }
      return u;
    });
    res.json({ orderItem: updated });

    // Customer-facing status-change notification (email + in-app + push + WhatsApp)
    // Fire-and-forget so the HTTP response is never blocked by slow SMTP / Meta.
    void (async () => {
      try {
        const statusLabel: Record<string, string> = {
          CONFIRMED: "confirmed",
          PACKED: "packed",
          SHIPPED: "shipped",
          OUT_FOR_DELIVERY: "out for delivery",
          DELIVERED: "delivered",
        };
        const label = statusLabel[status] ?? status.toLowerCase();
        const title = `Order ${label} — ${orderItem.name}`;
        const body = `Your order #${orderItem.order.id.slice(-8).toUpperCase()} has been ${label}. Track it in real time.`;
        const link = `/orders/${orderItem.order.id}`;
        await notify(orderItem.order.userId, "ORDER", title, body, link);
        await sendPushToUser(orderItem.order.userId, { title, body, url: link }).catch(() => {});
        if (orderItem.order.user?.phone) {
          await sendWhatsApp(
            orderItem.order.user.phone,
            `SKT Mart: ${title}\n${body}\nhttps://sktmart.vercel.app${link}`,
          ).catch(() => {});
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[vendor.status.notify]", (err as Error).message);
      }
    })();
  } catch (e) {
    next(e);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");

    const days = 30;
    const since = new Date(Date.now() - days * 86400_000);

    const [items, recentOrders, topProducts, lowStock] = await Promise.all([
      prisma.orderItem.findMany({
        where: { vendorId: vendor.id, order: { placedAt: { gte: since } } },
        select: {
          price: true,
          quantity: true,
          vendorEarn: true,
          productId: true,
          order: { select: { placedAt: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: { vendorId: vendor.id },
        orderBy: { order: { placedAt: "desc" } },
        take: 10,
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          status: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              placedAt: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId", "name"],
        where: { vendorId: vendor.id },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.product.findMany({
        where: { vendorId: vendor.id, stock: { lte: 5 }, published: true },
        select: { id: true, name: true, slug: true, stock: true, price: true },
        take: 10,
        orderBy: { stock: "asc" },
      }),
    ]);

    // Daily revenue time-series (last 30 days, ISO date string buckets)
    const bucket = new Map<string, { revenue: number; units: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      bucket.set(key, { revenue: 0, units: 0, orders: 0 });
    }
    const orderSeen = new Set<string>();
    for (const it of items) {
      const key = it.order.placedAt.toISOString().slice(0, 10);
      const b = bucket.get(key);
      if (!b) continue;
      b.revenue += it.price * it.quantity;
      b.units += it.quantity;
      const orderMarker = `${key}:${it.productId}`;
      if (!orderSeen.has(orderMarker)) {
        orderSeen.add(orderMarker);
        b.orders += 1;
      }
    }
    const series = Array.from(bucket.entries()).map(([date, v]) => ({ date, ...v }));

    const totalRevenue = items.reduce((s, r) => s + r.price * r.quantity, 0);
    const totalNet = items.reduce((s, r) => s + r.vendorEarn, 0);
    const totalUnits = items.reduce((s, r) => s + r.quantity, 0);

    res.json({
      period: { days, since: since.toISOString() },
      totals: {
        revenue: totalRevenue,
        netEarnings: totalNet,
        units: totalUnits,
        orders: items.length,
      },
      series,
      recentOrders,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.name,
        units: p._sum.quantity ?? 0,
        revenue: p._sum.price ?? 0,
      })),
      lowStock,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");
    const [productCount, orderAgg, pendingOrders, revenueRows] = await Promise.all([
      prisma.product.count({ where: { vendorId: vendor.id } }),
      prisma.orderItem.aggregate({
        where: { vendorId: vendor.id },
        _sum: { quantity: true },
        _count: true,
      }),
      prisma.orderItem.count({
        where: { vendorId: vendor.id, status: { in: ["PLACED", "CONFIRMED"] } },
      }),
      // Prisma aggregate doesn't support SUM(price * quantity); fetch the
      // columns and fold in JS so vendors who sell multiple units per line
      // see real revenue (a 10×₹500 line = ₹5,000, not ₹500).
      prisma.orderItem.findMany({
        where: { vendorId: vendor.id },
        select: { price: true, quantity: true, vendorEarn: true },
      }),
    ]);
    const revenue = revenueRows.reduce((s, r) => s + r.price * r.quantity, 0);
    const netEarn = revenueRows.reduce((s, r) => s + r.vendorEarn, 0);
    res.json({
      productCount,
      totalOrders: orderAgg._count,
      revenue,
      netEarnings: netEarn,
      unitsSold: orderAgg._sum.quantity ?? 0,
      pendingOrders,
    });
  } catch (e) {
    next(e);
  }
});

// Verify delivery OTP — vendor/delivery agent submits the 4-digit OTP the
// customer received. On match, all OUT_FOR_DELIVERY items in this order are
// marked DELIVERED and the OTP is cleared.
router.post("/orders/:orderId/verify-otp", async (req, res, next) => {
  try {
    const { otp } = z.object({ otp: z.string().length(4) }).parse(req.body);
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!vendor) throw new HttpError(404, "Vendor profile not found");

    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      select: { id: true, deliveryOtp: true, orderNumber: true },
    });
    if (!order) throw new HttpError(404, "Order not found");
    if (!order.deliveryOtp) throw new HttpError(400, "No delivery OTP set for this order");
    if (order.deliveryOtp !== otp) throw new HttpError(400, "Invalid OTP");

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          vendorId: vendor.id,
          status: "OUT_FOR_DELIVERY",
        },
        data: { status: "DELIVERED" },
      });
      // Check if all items are now delivered → update order status + clear OTP
      const remaining = await tx.orderItem.count({
        where: {
          orderId: order.id,
          status: { notIn: ["DELIVERED", "CANCELLED", "RETURNED"] },
        },
      });
      if (remaining === 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED", deliveryOtp: null },
        });
      }
    });

    res.json({ ok: true, message: "Delivery confirmed" });
  } catch (e) {
    next(e);
  }
});

export default router;
