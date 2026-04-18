import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getSettings } from "../lib/settings";

const router = Router();

function generateReferralCode(): string {
  return "SKT" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    let u = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!u) return res.status(404).json({ error: "User not found" });
    if (!u.referralCode) {
      let code = generateReferralCode();
      while (await prisma.user.findUnique({ where: { referralCode: code } })) {
        code = generateReferralCode();
      }
      u = await prisma.user.update({ where: { id: u.id }, data: { referralCode: code } });
    }
    const refs = await prisma.user.findMany({
      where: { referredById: u.id },
      select: { id: true, name: true, createdAt: true },
    });
    const settings = await getSettings();
    res.json({ code: u.referralCode, referrals: refs, bonusPaise: settings.referralBonusPaise });
  } catch (e) {
    next(e);
  }
});

const applySchema = z.object({ code: z.string().min(4) });

router.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const { code } = applySchema.parse(req.body);
    const u = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!u) return res.status(404).json({ error: "User not found" });
    if (u.referredById) return res.status(400).json({ error: "Referral already applied" });
    const ref = await prisma.user.findUnique({ where: { referralCode: code.toUpperCase() } });
    if (!ref || ref.id === u.id) return res.status(400).json({ error: "Invalid code" });
    await prisma.user.update({ where: { id: u.id }, data: { referredById: ref.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
