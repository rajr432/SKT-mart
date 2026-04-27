import { Router } from "express";
import { z } from "zod";
import type { ReturnStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { creditUserWallet } from "../lib/wallet";
import { notify } from "../lib/notify";
import { generateOrderNumber } from "../lib/order";
import { HttpError } from "../middleware/error";

const router = Router();

const createSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(2),
  description: z.string().optional(),
  refundMode: z.enum(["WALLET", "SOURCE", "REPLACE"]),
  items: z.array(z.object({
    orderItemId: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
    if (!order || order.userId !== req.user!.sub) return res.status(404).json({ error: "Not found" });
    if (order.status !== "DELIVERED") return res.status(400).json({ error: "Only delivered orders can be returned" });

    // Prorate the order-level discount (coupons etc.) across returned items.
    // The sum of order.items[].price * quantity is the pre-coupon item total;
    // order.total already accounts for every discount. Refunding raw price*qty
    // would over-credit the customer by the coupon portion, e.g. pay ₹900 with
    // a ₹100 coupon on a ₹1000 item → return it → get ₹1000 wallet credit.
    const grossItemTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    // Strip shipping + tax — those are not per-item costs and shouldn't be
    // refunded proportionally on a partial return (the remaining items still
    // carry the same shipping/tax burden). Only prorate item-level discounts
    // (coupons) which are bundled into `order.total - shipping - tax`.
    const itemNetTotal = Math.max(0, order.total - order.shippingFee - order.tax);
    const refundRatio = grossItemTotal > 0 ? itemNetTotal / grossItemTotal : 1;
    let refundPaise = 0;
    const itemsData = body.items.map((reqItem) => {
      const oi = order.items.find((x) => x.id === reqItem.orderItemId);
      if (!oi) throw new Error("Order item not found");
      const qty = Math.min(reqItem.quantity, oi.quantity);
      const refund = Math.round(oi.price * qty * refundRatio);
      refundPaise += refund;
      return { orderItemId: oi.id, productId: oi.productId, quantity: qty, refundPaise: refund };
    });

    const requestedIds = body.items.map((i) => i.orderItemId);
    // Duplicate check + create MUST be in the same tx — otherwise two
    // concurrent POSTs can both pass the `findFirst` guard (neither sees
    // the other's uncommitted insert) and each create a Return, leading
    // to double refunds on admin approval. REJECTED returns are fine to
    // re-request against. Serializable isolation ensures the findFirst
    // read-set is protected from phantom inserts within this tx.
    const ret = await prisma.$transaction(
      async (tx) => {
        const existingDup = await tx.returnItem.findFirst({
          where: {
            orderItemId: { in: requestedIds },
            return: { status: { notIn: ["REJECTED"] } },
          },
          include: { return: { select: { rmaNumber: true, status: true } } },
        });
        if (existingDup) {
          throw new HttpError(
            409,
            `A return already exists for one or more of these items (RMA ${existingDup.return.rmaNumber}, status ${existingDup.return.status})`,
          );
        }
        return tx.return.create({
          data: {
            rmaNumber: "RMA-" + generateOrderNumber().slice(4),
            orderId: order.id,
            userId: order.userId,
            reason: body.reason,
            description: body.description,
            refundMode: body.refundMode,
            refundPaise,
            items: { create: itemsData },
          },
          include: { items: true },
        });
      },
      { isolationLevel: "Serializable" },
    );

    await notify(order.userId, "RETURN", `Return requested: ${ret.rmaNumber}`, `We'll review your request shortly.`, `/orders/${order.id}`);
    res.status(201).json({ return: ret });
  } catch (e) {
    next(e);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.return.findMany({
      where: { userId: req.user!.sub },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const items = await prisma.return.findMany({
      include: { items: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const transitionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PICKED_UP", "RECEIVED", "REFUNDED", "REPLACED"]),
});

// Forward-only return lifecycle. Without this map an admin could walk a
// return REFUNDED → RECEIVED, double-dipping by both crediting the customer's
// wallet (line ~159) AND restocking inventory (line ~179) — vendor regains
// sellable stock while platform has already paid out the refund. Mirrors
// the STATUS_RANK pattern used for orders in admin.ts/vendor.ts.
const RETURN_RANK: Record<string, number> = {
  REQUESTED: 0,
  APPROVED: 1,
  // REJECTED ranks above APPROVED so an admin can reject after approving
  // (e.g. fraud discovered post-approval). Same rank as PICKED_UP makes
  // rejection from PICKED_UP/RECEIVED naturally blocked by the
  // `targetRank <= currentRank` check — once goods are physically picked
  // up or received the customer has already shipped product back and a
  // rejection without refund would be theft.
  REJECTED: 2, // terminal — reachable from REQUESTED + APPROVED
  PICKED_UP: 2,
  RECEIVED: 3,
  REFUNDED: 4, // terminal
  REPLACED: 4, // terminal
};
const TERMINAL_RETURN_STATUSES = new Set(["REJECTED", "REFUNDED", "REPLACED"]);

router.post("/:id/transition", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { status } = transitionSchema.parse(req.body);
    const r = await prisma.return.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!r) return res.status(404).json({ error: "Not found" });

    if (TERMINAL_RETURN_STATUSES.has(r.status)) {
      throw new HttpError(400, `Return is already ${r.status}; no further transitions allowed.`);
    }
    const currentRank = RETURN_RANK[r.status] ?? -1;
    const targetRank = RETURN_RANK[status] ?? -1;
    if (targetRank <= currentRank) {
      throw new HttpError(
        400,
        `Cannot move return from ${r.status} to ${status} (forward-only).`,
      );
    }

    // Atomic: flip the Return row to REFUNDED and credit the user's wallet in
    // the same transaction. If the wallet credit throws we roll back the status
    // change and surface a 500 so the admin can retry. Previously these were
    // two independent writes, so a transient failure after the status update
    // would leave a "REFUNDED" return with no corresponding wallet credit.
    const updated = await prisma.$transaction(async (tx) => {
      // CAS guard at DB level: only flip if the row is still in a strictly
      // lower-rank state. Combined with the precheck above this prevents a
      // racing transition (e.g. REFUNDED already applied by another admin)
      // from regressing the row.
      const allowedFromStatuses = (Object.entries(RETURN_RANK)
        .filter(([, rank]) => rank < targetRank)
        .map(([s]) => s)
        .filter((s) => !TERMINAL_RETURN_STATUSES.has(s))) as ReturnStatus[];
      const claim = await tx.return.updateMany({
        where: { id: r.id, status: { in: allowedFromStatuses } },
        data: { status },
      });
      if (claim.count === 0) {
        // Either already terminal, or already at requested status — no-op.
        return tx.return.findUniqueOrThrow({ where: { id: r.id } });
      }
      if (status === "REFUNDED" && (r.refundMode === "WALLET" || r.refundMode === "SOURCE")) {
        await creditUserWallet(
          r.userId,
          {
            amountPaise: r.refundPaise,
            reason: "REFUND",
            ref: r.id,
            note: r.refundMode === "SOURCE" ? "Refund processed (5-7 days to source)" : "Wallet refund",
          },
          tx,
        );
      }
      // Restock on physical receipt — RECEIVED is the single point where goods
      // are confirmed back in the warehouse. Without this, every successful
      // return permanently shrinks inventory (cancel flow restocks in
      // orders.ts:563-569; returns must mirror that). REFUNDED/REPLACED are
      // financial settlements only and must NOT restock (that would
      // double-count with RECEIVED). The `status !== r.status` claim above
      // guarantees RECEIVED is entered at most once per Return, so the loop
      // runs at most once.
      if (status === "RECEIVED") {
        for (const it of r.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
      }
      return tx.return.findUniqueOrThrow({ where: { id: r.id } });
    });

    if (status === "REFUNDED") {
      // Notification is best-effort; failure must not undo the refund.
      try {
        await notify(r.userId, "RETURN", `Refund issued: ${r.rmaNumber}`, `\u20B9${(r.refundPaise / 100).toFixed(0)} refunded.`, `/orders/${r.orderId}`);
      } catch (notifyErr) {
        console.error(`[returns] notify failed for return ${r.id}`, notifyErr);
      }
    }
    res.json({ return: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
