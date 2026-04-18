import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import type { Prisma } from "@prisma/client";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      fAssured,
      sort,
      page = "1",
      limit = "24",
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.ProductWhereInput = { published: true };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category) where.category = { slug: category };
    if (brand) where.brand = { equals: brand, mode: "insensitive" };
    if (fAssured === "true") where.fAssured = true;
    if (rating) where.rating = { gte: Number(rating) };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case "price_asc":
          return { price: "asc" };
        case "price_desc":
          return { price: "desc" };
        case "rating":
          return { rating: "desc" };
        case "newest":
          return { createdAt: "desc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const take = Math.min(Number(limit), 60);
    const skip = (Math.max(Number(page), 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          vendor: { select: { storeName: true, slug: true } },
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), limit: take });
  } catch (e) {
    next(e);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        images: { orderBy: { position: "asc" } },
        vendor: { select: { id: true, storeName: true, slug: true, rating: true } },
        category: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true, avatar: true } } },
        },
      },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

router.get("/:slug/related", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, categoryId: true },
    });
    if (!product) throw new HttpError(404, "Product not found");
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, published: true },
      take: 8,
      orderBy: { rating: "desc" },
      include: { images: { take: 1, orderBy: { position: "asc" } } },
    });
    res.json({ items: related });
  } catch (e) {
    next(e);
  }
});

const createProductSchema = z.object({
  vendorId: z.string(),
  categoryId: z.string(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string(),
  brand: z.string().optional(),
  sku: z.string(),
  mrp: z.number().int().positive(),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative().default(0),
  fAssured: z.boolean().default(false),
  images: z.array(z.string().url()).default([]),
  specs: z.record(z.any()).optional(),
});

export { createProductSchema };
export default router;
