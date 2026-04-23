import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const bundleSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i, "Slug must be url-safe"),
  description: z.string().optional(),
  discount: z.number().int().min(0).max(100).default(0),
  active: z.boolean().default(true),
  productIds: z.array(z.string()).min(2).max(10),
});

router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.bundle.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, slug: true, price: true } } },
        },
      },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = bundleSchema.parse(req.body);
    const bundle = await prisma.bundle.create({
      data: {
        title: data.title,
        slug: data.slug.toLowerCase(),
        description: data.description,
        discount: data.discount,
        active: data.active,
        items: { create: data.productIds.map((productId) => ({ productId })) },
      },
      include: { items: true },
    });
    res.status(201).json({ bundle });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = bundleSchema.partial().parse(req.body);
    const existing = await prisma.bundle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Bundle not found" });
    // If productIds is provided, replace the item set atomically.
    await prisma.$transaction(async (tx) => {
      await tx.bundle.update({
        where: { id: req.params.id },
        data: {
          title: data.title ?? undefined,
          slug: data.slug ? data.slug.toLowerCase() : undefined,
          description: data.description ?? undefined,
          discount: data.discount ?? undefined,
          active: data.active ?? undefined,
        },
      });
      if (data.productIds) {
        await tx.bundleItem.deleteMany({ where: { bundleId: req.params.id } });
        await tx.bundleItem.createMany({
          data: data.productIds.map((productId) => ({ bundleId: req.params.id, productId })),
          skipDuplicates: true,
        });
      }
    });
    const fresh = await prisma.bundle.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    res.json({ bundle: fresh });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.bundle.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
