import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { audit } from "../lib/audit";

const router = Router();

// Public: all currently-live flash sales (active + within time window + stock
// remaining). Includes a subset of product fields for storefront rendering.
router.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const items = await prisma.flashSale.findMany({
      where: {
        active: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            mrp: true,
            stock: true,
            images: { take: 1, orderBy: { position: "asc" } },
            rating: true,
            ratingCount: true,
          },
        },
      },
      orderBy: { endAt: "asc" },
      take: 60,
    });
    // Apply stock cap to what customers actually see left.
    const out = items
      .filter((i) => i.stock === null || i.sold < (i.stock ?? 0))
      .map((i) => ({
        id: i.id,
        name: i.name,
        productId: i.productId,
        discountPct: i.discountPct,
        priceOverride: i.priceOverride,
        startAt: i.startAt,
        endAt: i.endAt,
        stock: i.stock,
        sold: i.sold,
        product: i.product,
      }));
    res.json({ items: out });
  } catch (e) {
    next(e);
  }
});

// Admin-only: full list including past/future sales.
router.get("/admin", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const items = await prisma.flashSale.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true, price: true } },
      },
      orderBy: { startAt: "desc" },
      take: 200,
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const flashSaleBase = z.object({
  name: z.string().min(2).max(120),
  productId: z.string().min(1),
  discountPct: z.number().min(0).max(100).optional(),
  priceOverride: z.number().int().min(0).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const createSchema = flashSaleBase
  .refine(
    (b) => b.discountPct != null || b.priceOverride != null,
    "Either discountPct or priceOverride required",
  )
  .refine((b) => new Date(b.endAt) > new Date(b.startAt), "endAt must be after startAt");

const patchSchema = flashSaleBase.partial();

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: { id: true },
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const row = await prisma.flashSale.create({
      data: {
        name: body.name,
        productId: body.productId,
        discountPct: body.discountPct,
        priceOverride: body.priceOverride,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        stock: body.stock,
        active: body.active ?? true,
      },
    });
    await audit(req.user!.sub, "FLASH_SALE_CREATE", "FlashSale", row.id, body);
    res.status(201).json({ item: row });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const row = await prisma.flashSale.update({
      where: { id: req.params.id },
      data: {
        ...body,
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
      },
    });
    await audit(req.user!.sub, "FLASH_SALE_UPDATE", "FlashSale", row.id, body);
    res.json({ item: row });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.flashSale.delete({ where: { id: req.params.id } });
    await audit(req.user!.sub, "FLASH_SALE_DELETE", "FlashSale", req.params.id, {});
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
