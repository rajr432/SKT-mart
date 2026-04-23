import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.sub },
      include: {
        product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { productId } = z.object({ productId: z.string() }).parse(req.body);
    const item = await prisma.wishlistItem.upsert({
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
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.sub, productId: req.params.productId },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Bulk "move all in-stock wishlist items into cart" — skips out-of-stock so
// the customer isn't surprised by partial failures, returns counts for UI.
router.post("/move-to-cart", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, stock: true, published: true } } },
    });
    let moved = 0;
    let skipped = 0;
    for (const w of items) {
      if (!w.product?.published || w.product.stock <= 0) {
        skipped++;
        continue;
      }
      await prisma.cartItem.upsert({
        where: { userId_productId: { userId, productId: w.productId } },
        update: { quantity: { increment: 1 } },
        create: { userId, productId: w.productId, quantity: 1 },
      });
      await prisma.wishlistItem.delete({ where: { id: w.id } });
      moved++;
    }
    res.json({ moved, skipped });
  } catch (e) {
    next(e);
  }
});

export default router;
