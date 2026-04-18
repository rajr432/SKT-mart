import { Router } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.coupon.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.get("/:code", async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { code: req.params.code } });
    if (!coupon || !coupon.active) throw new HttpError(404, "Coupon not found");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new HttpError(410, "Coupon expired");
    res.json({ coupon });
  } catch (e) {
    next(e);
  }
});

export default router;
