import { Router } from "express";
import { prisma } from "../lib/prisma";
import { notify } from "../lib/notify";
import { HttpError } from "../middleware/error";

// Abandoned-cart recovery. This endpoint is designed to be hit by an
// external scheduler (Render Cron / GitHub Actions / a self-ping) every
// ~15 minutes; it has no user-facing auth but requires a shared secret in
// the `X-Cron-Secret` header so unauthenticated callers cannot spam emails.
//
// Contract:
//   GET /api/abandoned-cart/run?dryRun=1
//     header: X-Cron-Secret: <CRON_SECRET>
//
// Targeting: carts last updated >=1h ago and <24h ago, whose owner has an
// email, hasn't received an abandoned-cart reminder in the last 48h, and
// has at least one in-stock line. Cooldown enforced via a Notification row
// with a `[ABANDONED_CART]` title prefix — we reuse PROMO type since the
// enum doesn't have a dedicated value and adding one would require a
// schema migration for a purely cosmetic distinction.

const router = Router();

const WINDOW_MIN_MS = 60 * 60 * 1000;
const WINDOW_MAX_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 48 * 60 * 60 * 1000;
const TITLE = "[ABANDONED_CART] Your SKT Mart cart is waiting";

router.get("/run", async (req, res, next) => {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) throw new HttpError(503, "CRON_SECRET not configured");
    if (req.header("x-cron-secret") !== expected) throw new HttpError(401, "Unauthorized");
    const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";

    const now = Date.now();
    const maxUpdatedAt = new Date(now - WINDOW_MIN_MS);
    const minUpdatedAt = new Date(now - WINDOW_MAX_MS);
    const cooldownFrom = new Date(now - COOLDOWN_MS);

    const rows = await prisma.cartItem.findMany({
      where: { updatedAt: { gte: minUpdatedAt, lte: maxUpdatedAt } },
      select: { userId: true },
      distinct: ["userId"],
      take: 500,
    });
    let sent = 0;
    const results: Array<{ userId: string; email: string | null; reason: string }> = [];

    for (const { userId } of rows) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      if (!user?.email) {
        results.push({ userId, email: null, reason: "no-email" });
        continue;
      }
      const recent = await prisma.notification.findFirst({
        where: { userId, title: { startsWith: "[ABANDONED_CART]" }, createdAt: { gte: cooldownFrom } },
        select: { id: true },
      });
      if (recent) {
        results.push({ userId, email: user.email, reason: "cooldown" });
        continue;
      }
      const items = await prisma.cartItem.findMany({
        where: { userId },
        include: { product: { select: { name: true, stock: true, price: true } } },
      });
      const inStock = items.filter((i) => i.product.stock >= i.quantity);
      if (inStock.length === 0) {
        results.push({ userId, email: user.email, reason: "out-of-stock" });
        continue;
      }

      const total = inStock.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const lines = inStock.map((i) => `${i.product.name} × ${i.quantity}`).join(", ");
      const body = `Hi ${user.name ?? "there"}, you left ${inStock.length} item(s) (${lines}) in your cart worth ₹${Math.round(total / 100)}. Tap below to check out before stock runs out.`;

      if (!dryRun) {
        await notify(userId, "PROMO", TITLE, body, "/cart");
        sent += 1;
      }
      results.push({ userId, email: user.email, reason: dryRun ? "would-send" : "sent" });
    }

    res.json({ ok: true, dryRun, candidates: rows.length, sent, results });
  } catch (e) {
    next(e);
  }
});

export default router;
