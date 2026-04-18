import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.sub },
      include: {
        product: {
          include: { images: { take: 1, orderBy: { position: "asc" } } },
        },
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
    const { productId, quantity } = z
      .object({ productId: z.string(), quantity: z.number().int().min(1).max(20).default(1) })
      .parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, "Product not found");
    if (product.stock < quantity) throw new HttpError(400, "Insufficient stock");
    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.user!.sub, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user!.sub, productId, quantity },
    });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const { quantity } = z.object({ quantity: z.number().int().min(0).max(20) }).parse(req.body);
    const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.sub)
      throw new HttpError(404, "Item not found");
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
      res.json({ ok: true });
      return;
    }
    const item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
    });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.sub)
      throw new HttpError(404, "Item not found");
    await prisma.cartItem.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/", requireAuth, async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.sub } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
