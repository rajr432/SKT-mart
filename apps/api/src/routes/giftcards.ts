import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { creditUserWallet, debitUserWallet } from "../lib/wallet";

const router = Router();

function newCode(): string {
  return "GC-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Generate a unique gift-card code, retrying on the rare birthday collision
// against the @unique constraint on GiftCard.code. Without this retry, a
// collision (Math.random ~ 36^8 space is small enough to matter at scale)
// surfaces as a raw Prisma P2002 to the user after their wallet has been
// debited inside the tx, and while the tx rolls back the customer sees a
// cryptic 500. 5 attempts is vastly more than enough at any realistic scale.
async function generateUniqueCode(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const existing = await tx.giftCard.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique gift card code");
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
    // Gift cards must be paid for. We debit the buyer's wallet and mint the
    // card atomically — either both happen or neither — so we can never issue
    // free value. (Once a real payment gateway is wired in for off-wallet top-
    // ups, this debit is still the correct authoritative source of funds.)
    try {
      const card = await prisma.$transaction(async (tx) => {
        await debitUserWallet(
          req.user!.sub,
          {
            amountPaise,
            reason: "GIFT_CARD",
            note: recipient ? `Gift card for ${recipient}` : "Gift card purchase",
          },
          tx,
        );
        const code = await generateUniqueCode(tx);
        return tx.giftCard.create({
          data: {
            code,
            amountPaise,
            balancePaise: amountPaise,
            buyerId: req.user!.sub,
            recipient,
            message,
            expiresAt,
          },
        });
      });
      res.status(201).json({ giftCard: card });
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("insufficient")) {
        return res.status(400).json({ error: "Insufficient wallet balance to buy this gift card" });
      }
      throw err;
    }
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
    if (card.expiresAt < new Date()) return res.status(400).json({ error: "Card expired" });

    const amount = card.balancePaise;
    if (amount <= 0) return res.status(400).json({ error: "Card already used" });

    // All three writes — zero the card, record the redemption, credit the
    // wallet — must happen atomically. The conditional updateMany inside the
    // transaction still serves as a race-condition guard: only the winner of
    // a concurrent redeem flips balancePaise from >0 to 0; the loser sees
    // claim.count === 0 and we abort with a 409 before any side-effects.
    try {
      await prisma.$transaction(async (tx) => {
        const claim = await tx.giftCard.updateMany({
          where: { id: card.id, balancePaise: { gt: 0 } },
          data: { balancePaise: 0 },
        });
        if (claim.count === 0) throw new Error("ALREADY_REDEEMED");
        await tx.giftCardRedemption.create({
          data: { giftCardId: card.id, userId: req.user!.sub, amountPaise: amount },
        });
        await creditUserWallet(
          req.user!.sub,
          { amountPaise: amount, reason: "GIFT_CARD", ref: card.id, note: `Gift card ${card.code}` },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_REDEEMED") {
        return res.status(409).json({ error: "Card already redeemed" });
      }
      throw err;
    }
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
