import { Router } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: { include: { _count: { select: { products: true } } } },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { children: true, parent: true },
    });
    if (!category) throw new HttpError(404, "Category not found");
    res.json({ category });
  } catch (e) {
    next(e);
  }
});

export default router;
