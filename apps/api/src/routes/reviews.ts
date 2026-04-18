import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";

const router = Router();

router.get("/product/:productId", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, avatar: true } } },
    });
    res.json({ items: reviews });
  } catch (e) {
    next(e);
  }
});

const createSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  images: z.array(z.string()).default([]),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const userId = req.user!.sub;

    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: { userId, status: { in: ["DELIVERED"] } },
      },
    });

    const review = await prisma.review.upsert({
      where: { productId_userId: { productId: data.productId, userId } },
      update: { ...data, verified: !!hasPurchased },
      create: { ...data, userId, verified: !!hasPurchased },
    });

    // Recompute product rating
    const agg = await prisma.review.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: data.productId },
      data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count },
    });

    res.status(201).json({ review });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.sub)
      throw new HttpError(404, "Review not found");
    await prisma.review.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
