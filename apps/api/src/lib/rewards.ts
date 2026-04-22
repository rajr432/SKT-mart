import { prisma } from "./prisma";
import type { Tx } from "./wallet";
import { creditUserWallet, debitUserWallet } from "./wallet";
import { getSettings } from "./settings";
import { notify } from "./notify";

// Order rewards = loyalty points for the buyer + first-order referral bonus
// for whoever referred them. These are value transfers that must only happen
// once the order is actually paid (paymentStatus='PAID'), otherwise abandoned
// Razorpay/UPI checkouts turn into free points + real wallet credits for the
// referrer.
//
// Idempotency:
//   - loyalty: guarded by findFirst on LoyaltyTransaction(ref=orderId, reason=ORDER_EARN)
//   - referral: guarded by findFirst on WalletTransaction(ref=orderId, reason=REFERRAL)
// Re-running `awardOrderRewards` on the same order is a no-op past the first
// successful call, so it's safe to invoke from both the WALLET post-commit
// path and the Razorpay verify path without worrying about double-credit.

export async function awardOrderRewards(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      total: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (!order) return;
  // Gate on PAID + not-cancelled — caller may race with a cancel.
  if (order.paymentStatus !== "PAID") return;
  if (["CANCELLED", "RETURNED"].includes(order.status)) return;

  const settings = await getSettings();

  // ---- Loyalty (idempotent) ----
  const points =
    Math.floor(order.total / 10000) * settings.loyaltyEarnPer100;
  if (points > 0) {
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: { userId: order.userId, ref: order.id, reason: "ORDER_EARN" },
      select: { id: true },
    });
    if (!existing) {
      const updated = await prisma.user.update({
        where: { id: order.userId },
        data: { loyaltyPoints: { increment: points } },
        select: { loyaltyPoints: true },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId: order.userId,
          points,
          reason: "ORDER_EARN",
          ref: order.id,
          balanceAfter: updated.loyaltyPoints,
        },
      });
    }
  }

  // ---- Referral bonus on first PAID order (idempotent) ----
  //
  // `userOrderCount` counts PAID orders for this user, not all orders. An
  // abandoned-then-retried Razorpay checkout (PENDING orders) must not
  // suppress the bonus on the eventual first PAID order, and a user who has
  // placed only CANCELLED orders earlier should still count their first PAID
  // as "first".
  const paidOrderCount = await prisma.order.count({
    where: { userId: order.userId, paymentStatus: "PAID" },
  });
  if (paidOrderCount === 1) {
    const existingRef = await prisma.walletTransaction.findFirst({
      where: { ref: order.id, reason: "REFERRAL" },
      select: { id: true },
    });
    if (!existingRef) {
      const u = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { referredById: true, name: true },
      });
      if (u?.referredById) {
        await creditUserWallet(u.referredById, {
          amountPaise: settings.referralBonusPaise,
          reason: "REFERRAL",
          ref: order.id,
          note: `Referral bonus from ${u.name}`,
        });
        await notify(
          u.referredById,
          "WALLET",
          "Referral bonus credited!",
          `\u20B9${(settings.referralBonusPaise / 100).toFixed(0)} added to your wallet.`,
          "/account",
        );
      }
    }
  }
}

// Reverse both the loyalty award and the referral bonus for an order. Called
// inside the cancel $transaction of both orders.ts (customer cancel) and
// admin.ts (admin cancel). Clamps each reversal to the current balance so
// concurrent redemptions between award and cancel don't drive balances
// negative.
export async function clawbackOrderRewards(
  tx: Tx,
  orderId: string,
): Promise<void> {
  const earn = await tx.loyaltyTransaction.findFirst({
    where: { ref: orderId, reason: "ORDER_EARN" },
    select: { userId: true, points: true },
  });
  if (earn && earn.points > 0) {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: earn.userId },
      select: { loyaltyPoints: true },
    });
    const clawback = Math.min(earn.points, user.loyaltyPoints);
    if (clawback > 0) {
      const after = await tx.user.update({
        where: { id: earn.userId },
        data: { loyaltyPoints: { decrement: clawback } },
        select: { loyaltyPoints: true },
      });
      await tx.loyaltyTransaction.create({
        data: {
          userId: earn.userId,
          points: -clawback,
          reason: "ORDER_CANCEL",
          ref: orderId,
          balanceAfter: after.loyaltyPoints,
        },
      });
    }
  }

  // Referral bonus reversal: if the referrer was credited for this order,
  // debit their wallet (clamped to current balance). Without this, a refer-
  // rer could permanently keep the bonus on a cancelled order. Guarded by
  // findFirst so repeated calls are idempotent.
  const ref = await tx.walletTransaction.findFirst({
    where: { ref: orderId, reason: "REFERRAL", type: "CREDIT" },
    select: { userId: true, amountPaise: true },
  });
  if (ref && ref.userId && ref.amountPaise > 0) {
    // Already-reversed? Look for a matching ADJUSTMENT debit we wrote below.
    const already = await tx.walletTransaction.findFirst({
      where: {
        ref: orderId,
        reason: "ADJUSTMENT",
        type: "DEBIT",
        userId: ref.userId,
      },
      select: { id: true },
    });
    if (!already) {
      const current = await tx.user.findUniqueOrThrow({
        where: { id: ref.userId },
        select: { walletBalance: true },
      });
      const debit = Math.min(ref.amountPaise, current.walletBalance);
      if (debit > 0) {
        await debitUserWallet(
          ref.userId,
          {
            amountPaise: debit,
            reason: "ADJUSTMENT",
            ref: orderId,
            note: `Referral bonus reversed (order cancelled)`,
          },
          tx,
        );
      }
    }
  }
}
