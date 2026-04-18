import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { creditUserWallet } from "../lib/wallet";

const router = Router();

function newCode(): string {
  return "GC-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

const buySchema = z.object({
  amountPaise: z.number().int().min(10000),
  recipient: z.string().optional(),
  message: z.string().optional(),
});

router.post("/buy", requireAuth, async (req, res, next) => {
  try {
    const { amountPaise, recipient, message } = buySchema.parse(req.body);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const card = await prisma.giftCard.create({
      data: {
        code: newCode(),
        amountPaise,
        balancePaise: amountPaise,
        buyerId: req.user!.sub,
        recipient,
        message,
        expiresAt,
      },
    });
    res.status(201).json({ giftCard: card });
  } catch (e) {
    next(e);
  }
});

const redeemSchema = z.object({ code: z.string().min(4) });

router.post("/redeem", requireAuth, async (req, res, next) => {
  try {
    const { code } = redeemSchema.parse(req.body);
    const card = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
    if (!card || !card.active) return res.status(404).json({ error: "Invalid card" });
    if (card.balancePaise <= 0) return res.status(400).json({ error: "Card already used" });
    if (card.expiresAt < new Date()) return res.status(400).json({ error: "Card expired" });

    const amount = card.balancePaise;
    await prisma.$transaction([
      prisma.giftCard.update({ where: { id: card.id }, data: { balancePaise: 0 } }),
      prisma.giftCardRedemption.create({
        data: { giftCardId: card.id, userId: req.user!.sub, amountPaise: amount },
      }),
    ]);
    await creditUserWallet(req.user!.sub, {
      amountPaise: amount,
      reason: "GIFT_CARD",
      ref: card.id,
      note: `Gift card ${card.code}`,
    });
    res.json({ creditedPaise: amount });
  } catch (e) {
    next(e);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.giftCard.findMany({
      where: { buyerId: req.user!.sub },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
