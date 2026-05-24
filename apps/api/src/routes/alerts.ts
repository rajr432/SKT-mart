import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

const stockSchema = z.object({ productId: z.string() });
router.post("/stock", requireAuth, async (req, res, next) => {
  try {
    const { productId } = stockSchema.parse(req.body);
    const a = await prisma.stockAlert.upsert({
      where: { userId_productId: { userId: req.user!.sub, productId } },
      update: { notified: false },
      create: { userId: req.user!.sub, productId },
    });
    res.json({ alert: a });
  } catch (e) {
    next(e);
  }
});

const priceSchema = z.object({ productId: z.string(), targetPrice: z.number().int().min(1) });
router.post("/price", requireAuth, async (req, res, next) => {
  try {
    const { productId, targetPrice } = priceSchema.parse(req.body);
    const a = await prisma.priceAlert.upsert({
      where: { userId_productId: { userId: req.user!.sub, productId } },
      update: { targetPrice, notified: false },
      create: { userId: req.user!.sub, productId, targetPrice },
    });
    res.json({ alert: a });
  } catch (e) {
    next(e);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const [stock, price] = await Promise.all([
      prisma.stockAlert.findMany({
        where: { userId: req.user!.sub },
        include: { product: { include: { images: { take: 1 } } } },
      }),
      prisma.priceAlert.findMany({
        where: { userId: req.user!.sub },
        include: { product: { include: { images: { take: 1 } } } },
      }),
    ]);
    res.json({ stock, price });
  } catch (e) {
    next(e);
  }
});

export default router;
