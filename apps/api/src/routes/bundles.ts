import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

// Public: list active bundles (homepage + promo)
router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.bundle.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                mrp: true,
                images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
              },
            },
          },
        },
      },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Public: bundles containing a given product — "Frequently bought together"
router.get("/for-product/:productId", async (req, res, next) => {
  try {
    const items = await prisma.bundle.findMany({
      where: {
        active: true,
        items: { some: { productId: req.params.productId } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                mrp: true,
                stock: true,
                images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
              },
            },
          },
        },
      },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
