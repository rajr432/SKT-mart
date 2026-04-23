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
// Idempotency is enforced at the database level, not just with findFirst
// check-then-act:
//   - loyalty:  LoyaltyTransaction has @@unique([userId, ref, reason]) — a
//               second concurrent insert raises P2002, which we catch and
//               treat as already-awarded (no second balance increment).
//   - referral: User.referralBonusClaimed is flipped via updateMany CAS
//               (`referralBonusClaimed: false`) — only one concurrent award
//               call wins the claim; the others see count=0 and skip the
//               wallet credit entirely.
// Both are safe to invoke from the WALLET post-commit path AND the Razorpay
// verify path AND from duplicate-verify retries, and still under read-
// committed isolation.

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
  if (order.paymentStatus !== "PAID") return;
  if (["CANCELLED", "RETURNED"].includes(order.status)) return;

  const settings = await getSettings();
  const points =
    Math.floor(order.total / 10000) * settings.loyaltyEarnPer100;

  // Run loyalty and referral in SEPARATE transactions. A P2002 unique-
  // violation inside a PostgreSQL transaction puts the whole tx into an
  // aborted state — every subsequent statement fails with "current
  // transaction is aborted". So we can't catch P2002 on the loyalty
  // create and then continue to the referral path in the same tx; the
  // referral queries would error out and roll the whole thing back
  // (undoing a successful referral credit if loyalty happened to race).
  // Keeping them independent also means one path's rollback / conflict
  // never poisons the other.

  // ---- Loyalty (tx 1) — DB-level idempotent via @@unique ----
  if (points > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: points } },
          select: { loyaltyPoints: true },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            points,
            reason: "ORDER_EARN",
            ref: order.id,
            balanceAfter: updated.loyaltyPoints,
          },
        });
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e;
      // Already awarded by a concurrent call. The tx above rolled back
      // on the unique violation, so the user.update increment was
      // discarded in the same atomic step. No further work here.
    }
  }

  // ---- Referral bonus (tx 2) — CAS on User.referralBonusClaimed ----
  //
  // Flip the flag atomically and only proceed if we actually won the
  // claim. Two concurrent paid orders from the same user: only one
  // updateMany returns count=1, the other returns 0 and skips the
  // credit. No check-then-act, no unique violation, no catch needed.
  // Farming is separately blocked by the cancel clawback which reverses
  // both the bonus and the flag.
  const notifyPayload = await prisma.$transaction(async (tx) => {
    const claim = await tx.user.updateMany({
      where: {
        id: order.userId,
        referralBonusClaimed: false,
        referredById: { not: null },
      },
      data: { referralBonusClaimed: true },
    });
    if (claim.count !== 1) return null;
    const u = await tx.user.findUniqueOrThrow({
      where: { id: order.userId },
      select: { referredById: true, name: true },
    });
    if (!u.referredById) return null;
    await creditUserWallet(
      u.referredById,
      {
        amountPaise: settings.referralBonusPaise,
        reason: "REFERRAL",
        ref: order.id,
        note: `Referral bonus from ${u.name}`,
      },
      tx,
    );
    return {
      referrerId: u.referredById,
      amountPaise: settings.referralBonusPaise,
    };
  });

  // Fire notification only after the tx has committed successfully, so a
  // rollback doesn't leave an orphan "bonus credited" email.
  if (notifyPayload) {
    void notify(
      notifyPayload.referrerId,
      "WALLET",
      "Referral bonus credited!",
      `\u20B9${(notifyPayload.amountPaise / 100).toFixed(0)} added to your wallet.`,
      "/account",
    );
  }
}

// Reverse both the loyalty award and the referral bonus for an order. Called
// inside the cancel $transaction of both orders.ts (customer cancel) and
// admin.ts (admin cancel). Clamps each reversal to the current balance so
// concurrent redemptions between award and cancel don't drive balances
// negative. Also resets User.referralBonusClaimed so a legit retry of a
// cancelled first-order still triggers the bonus on the next PAID order.
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
  // debit their wallet (clamped) and reset the buyer's referralBonusClaimed
  // flag so a legit retry on a new order can re-trigger. Without the reset,
  // a user whose first order is cancelled would never get their referrer
  // the bonus, even on a successful second order.
  const ref = await tx.walletTransaction.findFirst({
    where: { ref: orderId, reason: "REFERRAL", type: "CREDIT" },
    select: { userId: true, amountPaise: true },
  });
  if (ref && ref.userId && ref.amountPaise > 0) {
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
      // Reset the buyer's claim flag so their next PAID order can award
      // again. Look up the buyer via the cancelled order.
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      if (order) {
        await tx.user.updateMany({
          where: { id: order.userId, referralBonusClaimed: true },
          data: { referralBonusClaimed: false },
        });
      }
    }
  }
}
