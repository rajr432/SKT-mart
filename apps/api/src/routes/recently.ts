import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

const trackSchema = z.object({ productId: z.string() });

router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { productId } = trackSchema.parse(req.body);
    if (!req.user) return res.json({ ok: true });
    await prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId: req.user.sub, productId } },
      update: { viewedAt: new Date() },
      create: { userId: req.user.sub, productId },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { views: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.recentlyViewed.findMany({
      where: { userId: req.user!.sub },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { viewedAt: "desc" },
      take: 12,
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
