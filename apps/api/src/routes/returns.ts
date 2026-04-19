import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { creditUserWallet } from "../lib/wallet";
import { notify } from "../lib/notify";
import { generateOrderNumber } from "../lib/order";

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

    let refundPaise = 0;
    const itemsData = body.items.map((reqItem) => {
      const oi = order.items.find((x) => x.id === reqItem.orderItemId);
      if (!oi) throw new Error("Order item not found");
      const qty = Math.min(reqItem.quantity, oi.quantity);
      const refund = oi.price * qty;
      refundPaise += refund;
      return { orderItemId: oi.id, productId: oi.productId, quantity: qty, refundPaise: refund };
    });

    const ret = await prisma.return.create({
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

router.post("/:id/transition", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { status } = transitionSchema.parse(req.body);
    const r = await prisma.return.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!r) return res.status(404).json({ error: "Not found" });

    // Atomic: flip the Return row to REFUNDED and credit the user's wallet in
    // the same transaction. If the wallet credit throws we roll back the status
    // change and surface a 500 so the admin can retry. Previously these were
    // two independent writes, so a transient failure after the status update
    // would leave a "REFUNDED" return with no corresponding wallet credit.
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.return.update({ where: { id: r.id }, data: { status } });
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
      return row;
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
