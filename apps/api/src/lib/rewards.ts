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
// Idempotency + cancel-race-safety is enforced at the database level:
//   - loyalty:  LoyaltyTransaction has @@unique([userId, ref, reason]) — a
//               second concurrent insert raises P2002, which we catch and
//               treat as already-awarded (no second balance increment).
//   - referral: User.referralBonusClaimed is flipped via updateMany CAS
//               (`referralBonusClaimed: false`) — only one concurrent award
//               call wins the claim; the others see count=0 and skip the
//               wallet credit entirely.
//
// Atomicity with the PAID transition: callers that transition an order to
// paymentStatus='PAID' inside a $transaction (WALLET placement in orders.ts,
// /razorpay/verify in payments.ts) MUST pass their `tx` client so the award
// commits together with the payment flip. Otherwise a customer-cancel racing
// between the commit and a post-commit award call could skip clawback
// (clawback finds no ORDER_EARN/REFERRAL rows yet) and then the award would
// commit onto a CANCELLED order — permanently awarding a referrer ₹bonus +
// loyalty points for an order whose money was refunded.

interface RewardContext {
  order: {
    id: string;
    userId: string;
    total: number;
  };
  loyaltyPoints: number;
  referralBonusPaise: number;
}

async function loadContext(
  prismaClient: Tx | typeof prisma,
  orderId: string,
): Promise<RewardContext | null> {
  const order = await prismaClient.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      total: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (!order) return null;
  if (order.paymentStatus !== "PAID") return null;
  if (order.status === "CANCELLED" || order.status === "RETURNED") return null;
  const settings = await getSettings();
  return {
    order: { id: order.id, userId: order.userId, total: order.total },
    loyaltyPoints:
      Math.floor(order.total / 10000) * settings.loyaltyEarnPer100,
    referralBonusPaise: settings.referralBonusPaise,
  };
}

async function awardLoyalty(tx: Tx, ctx: RewardContext): Promise<void> {
  if (ctx.loyaltyPoints <= 0) return;
  const updated = await tx.user.update({
    where: { id: ctx.order.userId },
    data: { loyaltyPoints: { increment: ctx.loyaltyPoints } },
    select: { loyaltyPoints: true },
  });
  await tx.loyaltyTransaction.create({
    data: {
      userId: ctx.order.userId,
      points: ctx.loyaltyPoints,
      reason: "ORDER_EARN",
      ref: ctx.order.id,
      balanceAfter: updated.loyaltyPoints,
    },
  });
}

async function awardReferral(
  tx: Tx,
  ctx: RewardContext,
): Promise<{ referrerId: string; amountPaise: number } | null> {
  const claim = await tx.user.updateMany({
    where: {
      id: ctx.order.userId,
      referralBonusClaimed: false,
      referredById: { not: null },
    },
    data: { referralBonusClaimed: true },
  });
  if (claim.count !== 1) return null;
  const u = await tx.user.findUniqueOrThrow({
    where: { id: ctx.order.userId },
    select: { referredById: true, name: true },
  });
  if (!u.referredById) return null;
  await creditUserWallet(
    u.referredById,
    {
      amountPaise: ctx.referralBonusPaise,
      reason: "REFERRAL",
      ref: ctx.order.id,
      note: `Referral bonus from ${u.name}`,
    },
    tx,
  );
  return {
    referrerId: u.referredById,
    amountPaise: ctx.referralBonusPaise,
  };
}

// Fire-and-forget notification to the referrer, after their tx commits. The
// caller is responsible for calling this only when the enclosing tx has
// actually committed, so a rollback doesn't leave an orphan "bonus credited"
// email.
function notifyReferrer(payload: {
  referrerId: string;
  amountPaise: number;
}): void {
  void notify(
    payload.referrerId,
    "WALLET",
    "Referral bonus credited!",
    `\u20B9${(payload.amountPaise / 100).toFixed(0)} added to your wallet.`,
    "/account",
  );
}

// In-tx variant: composes into the caller's $transaction so the award is
// atomic with the PAID transition. No P2002 catch because the caller has
// already gated entry (e.g. via updateMany CAS on paymentStatus) — only one
// caller can reach this point per order, so LoyaltyTransaction unique cannot
// race with itself. The returned notifyPayload MUST be dispatched by the
// caller after their tx commits (see notifyReferrerAfterCommit).
export async function awardOrderRewardsInTx(
  tx: Tx,
  orderId: string,
): Promise<{ referrerId: string; amountPaise: number } | null> {
  const ctx = await loadContext(tx, orderId);
  if (!ctx) return null;
  await awardLoyalty(tx, ctx);
  return awardReferral(tx, ctx);
}

export function notifyReferrerAfterCommit(
  payload: { referrerId: string; amountPaise: number } | null,
): void {
  if (payload) notifyReferrer(payload);
}

// Cancel clawback — reverse both awards. Called inside the cancel $transaction
// (customer and admin paths). Idempotent: re-running on an already-clawed-back
// order is a no-op. Clamps deductions to current balances so concurrent spend
// between award and clawback cannot drive balances negative.
export async function clawbackOrderRewards(
  tx: Tx,
  orderId: string,
): Promise<void> {
  const earn = await tx.loyaltyTransaction.findFirst({
    where: { ref: orderId, reason: "ORDER_EARN" },
    select: { userId: true, points: true },
  });
  if (earn && earn.points > 0) {
    const already = await tx.loyaltyTransaction.findFirst({
      where: { ref: orderId, reason: "ORDER_CANCEL" },
      select: { id: true },
    });
    if (!already) {
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
  }

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
