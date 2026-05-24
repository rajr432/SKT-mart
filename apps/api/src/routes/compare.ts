import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.comparison.findMany({
      where: { userId: req.user!.sub },
      include: { product: { include: { images: { take: 1 }, vendor: true, category: true } } },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const addSchema = z.object({ productId: z.string() });
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { productId } = addSchema.parse(req.body);
    const count = await prisma.comparison.count({ where: { userId: req.user!.sub } });
    if (count >= 4) return res.status(400).json({ error: "Compare list full (max 4)" });
    const item = await prisma.comparison.upsert({
      where: { userId_productId: { userId: req.user!.sub, productId } },
      update: {},
      create: { userId: req.user!.sub, productId },
    });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

router.delete("/:productId", requireAuth, async (req, res, next) => {
  try {
    await prisma.comparison.deleteMany({
      where: { userId: req.user!.sub, productId: req.params.productId },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
