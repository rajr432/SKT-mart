import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
