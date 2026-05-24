import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Public listing of active brands. Used by the storefront brand strip and
// search facet. Admin CRUD lives under /api/admin/brands.
router.get("/", async (req, res, next) => {
  try {
    const featured = req.query.featured === "true";
    const where: { active: boolean; featured?: boolean } = { active: true };
    if (featured) where.featured = true;
    const items = await prisma.brand.findMany({
      where,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, logo: true, featured: true },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
