import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getSettings } from "../lib/settings";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { loyaltyPoints: true },
    });
    const txns = await prisma.loyaltyTransaction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const settings = await getSettings();
    res.json({
      points: u?.loyaltyPoints ?? 0,
      valuePaisePerPoint: settings.loyaltyValuePaise,
      maxRedeemPct: settings.loyaltyMaxRedeemPct,
      transactions: txns,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
