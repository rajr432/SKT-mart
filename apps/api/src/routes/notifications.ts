import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user!.sub, read: false },
    });
    res.json({ items, unread });
  } catch (e) {
    next(e);
  }
});

router.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!n || n.userId !== req.user!.sub) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { read: true },
    });
    res.json({ notification: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
