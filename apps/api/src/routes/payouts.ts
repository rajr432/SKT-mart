import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { audit } from "../lib/audit";
import { creditVendorWallet } from "../lib/wallet";

const router = Router();

// Admin: list payouts
router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const items = await prisma.payout.findMany({
      include: { vendor: { select: { storeName: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Admin: generate payout for a vendor for a period
const genSchema = z.object({
  vendorId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

router.post("/generate", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { vendorId, periodStart, periodEnd } = genSchema.parse(req.body);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const items = await prisma.orderItem.findMany({
      where: {
        vendorId,
        status: "DELIVERED",
        order: { placedAt: { gte: start, lte: end } },
      },
      include: { commissionRecord: true, order: true },
    });

    const grossSales = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalCommission = items.reduce((s, i) => s + (i.commissionRecord?.amountPaise ?? i.commission), 0);

    // Refunds in period
    const refunds = await prisma.return.findMany({
      where: {
        status: "REFUNDED",
        items: { some: { orderItem: { vendorId } } },
        updatedAt: { gte: start, lte: end },
      },
    });
    const totalRefunds = refunds.reduce((s, r) => s + r.refundPaise, 0);

    // Ad spend in period
    const adSpend = await prisma.walletTransaction.aggregate({
      where: {
        vendorId,
        reason: "AD_SPEND",
        createdAt: { gte: start, lte: end },
      },
      _sum: { amountPaise: true },
    });
    const totalAdSpend = adSpend._sum.amountPaise ?? 0;

    // Clamp at 0: deductions (commission + refunds + ad spend) can exceed
    // gross sales in heavy-refund or refunds-only periods. We never owe the
    // vendor a negative payout — the carry-forward is an accounting concern
    // (deficit shows in the next period as those refund/ad rows recur, but
    // we don't let the recorded payout row go negative or call wallet
    // increment with a negative number).
    const netAmount = Math.max(0, grossSales - totalCommission - totalRefunds - totalAdSpend);

    const payout = await prisma.payout.create({
      data: {
        vendorId,
        periodStart: start,
        periodEnd: end,
        grossSales,
        totalCommission,
        totalRefunds,
        totalAdSpend,
        netAmount,
        status: "PENDING",
      },
    });

    // Link commissions to payout — MUST mirror the aggregation filter above
    // (status: DELIVERED). Otherwise commissions for SHIPPED/PACKED/PLACED
    // items in the period would be marked paid but never included in any
    // payout's totals, permanently orphaning vendor earnings.
    await prisma.commission.updateMany({
      where: {
        vendorId,
        payoutId: null,
        orderItem: { status: "DELIVERED", order: { placedAt: { gte: start, lte: end } } },
      },
      data: { payoutId: payout.id },
    });

    await audit(req.user!.sub, "PAYOUT_GENERATE", "Payout", payout.id, { vendorId, netAmount });
    res.status(201).json({ payout });
  } catch (e) {
    next(e);
  }
});

const markPaidSchema = z.object({ utr: z.string().min(2), notes: z.string().optional() });

router.post("/:id/mark-paid", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { utr, notes } = markPaidSchema.parse(req.body);
    const p = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: "Not found" });
    if (p.status === "PAID") return res.status(400).json({ error: "Already paid" });
    // Atomic: flip to PAID and credit the vendor wallet together. Without this,
    // a wallet failure would leave the payout stuck in PAID (the guard above
    // blocks retries) while the vendor never receives the settlement.
    const updated = await prisma.$transaction(async (tx) => {
      // Race-safe claim: only one concurrent caller can flip a non-PAID
      // payout to PAID. The loser sees count===0 and aborts before any
      // wallet credit runs (mirrors the pattern in orders.ts / returns.ts).
      const claim = await tx.payout.updateMany({
        where: { id: p.id, status: { not: "PAID" } },
        data: { status: "PAID", utr, notes, paidAt: new Date() },
      });
      if (claim.count === 0) throw new Error("Payout already paid");
      // Credit only when net is actually positive; a non-positive net means
      // deductions exceeded gross sales, in which case we record the payout
      // but skip the wallet credit (no negative CREDIT rows).
      if (p.netAmount > 0) {
        await creditVendorWallet(
          p.vendorId,
          {
            amountPaise: p.netAmount,
            reason: "PAYOUT",
            ref: p.id,
            note: `Settlement ${p.id} via UTR ${utr}`,
          },
          tx,
        );
      }
      return tx.payout.findUniqueOrThrow({ where: { id: p.id } });
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "Payout already paid") {
        const err = new Error(msg) as Error & { status?: number };
        err.status = 400;
        throw err;
      }
      throw e;
    });
    await audit(req.user!.sub, "PAYOUT_PAID", "Payout", p.id, { utr, netAmount: p.netAmount });
    res.json({ payout: updated });
  } catch (e) {
    next(e);
  }
});

// Vendor: my payouts
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const v = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
    if (!v) return res.status(404).json({ error: "Vendor not found" });
    const items = await prisma.payout.findMany({
      where: { vendorId: v.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

export default router;
