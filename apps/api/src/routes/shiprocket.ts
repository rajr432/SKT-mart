import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import {
  createShiprocketOrder,
  trackShipment,
  isShiprocketConfigured,
  cancelShiprocketOrder,
  type ShiprocketOrderPayload,
} from "../lib/shiprocket";

const router = Router();

router.use(requireAuth);

/**
 * POST /api/shiprocket/create-shipment/:orderId
 * Admin/vendor creates a Shiprocket shipment for an order.
 */
router.post("/create-shipment/:orderId", async (req, res, next) => {
  try {
    if (!isShiprocketConfigured()) {
      throw new HttpError(503, "Shiprocket not configured — set SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD on server");
    }
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        user: true,
        address: true,
        items: { include: { product: true } },
      },
    });
    if (!order) throw new HttpError(404, "Order not found");

    // Check if user is admin OR the vendor who owns items in this order
    const isAdmin = req.user!.role === "ADMIN";
    if (!isAdmin) {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.sub } });
      if (!vendor) throw new HttpError(403, "Only admin or vendor can create shipments");
      const ownsItems = order.items.some((i) => i.vendorId === vendor.id);
      if (!ownsItems) throw new HttpError(403, "You don't have items in this order");
    }

    const addr = order.address;
    if (!addr) throw new HttpError(400, "Order has no delivery address");

    const payload: ShiprocketOrderPayload = {
      order_id: order.orderNumber,
      order_date: new Date(order.placedAt)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16),
      billing_customer_name: order.user.name.split(" ")[0] ?? order.user.name,
      billing_last_name: order.user.name.split(" ").slice(1).join(" ") || undefined,
      billing_address: addr.line1,
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: addr.state,
      billing_country: "India",
      billing_email: order.user.email ?? "",
      billing_phone: order.user.phone ?? addr.phone ?? "",
      shipping_is_billing: true,
      order_items: order.items.map((i) => ({
        name: i.product.name,
        sku: i.product.sku,
        units: i.quantity,
        selling_price: i.price / 100,
      })),
      payment_method: order.paymentStatus === "PAID" ? "Prepaid" : "COD",
      sub_total: order.total / 100,
      length: 20,
      breadth: 15,
      height: 10,
      weight: 0.5,
    };

    const result = await createShiprocketOrder(payload);
    if (!result) {
      throw new HttpError(502, "Shiprocket order creation failed — check server logs");
    }

    // Store Shiprocket IDs on the order for tracking
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shiprocketOrderId: result.order_id,
        shiprocketShipmentId: result.shipment_id,
      },
    });

    res.json({
      ok: true,
      shiprocket: {
        orderId: result.order_id,
        shipmentId: result.shipment_id,
        status: result.status,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/shiprocket/track/:orderId
 * Get real-time tracking for an order's shipment.
 */
router.get("/track/:orderId", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      select: {
        id: true,
        userId: true,
        shiprocketShipmentId: true,
        orderNumber: true,
      },
    });
    if (!order) throw new HttpError(404, "Order not found");

    // Allow: owner, admin, or vendor with items
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = order.userId === req.user!.sub;
    if (!isAdmin && !isOwner) {
      throw new HttpError(403, "Not authorized");
    }

    if (!order.shiprocketShipmentId) {
      res.json({ tracking: null, message: "Shipment not yet created on Shiprocket" });
      return;
    }

    const tracking = await trackShipment(order.shiprocketShipmentId);
    res.json({ tracking });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/shiprocket/cancel/:orderId
 * Cancel a Shiprocket shipment (admin only).
 */
router.post("/cancel/:orderId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      select: { shiprocketOrderId: true },
    });
    if (!order?.shiprocketOrderId) {
      throw new HttpError(400, "No Shiprocket order to cancel");
    }
    const result = await cancelShiprocketOrder([order.shiprocketOrderId]);
    res.json({ ok: true, result });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/shiprocket/status
 * Check if Shiprocket is configured.
 */
router.get("/status", (_req, res) => {
  res.json({ configured: isShiprocketConfigured() });
});

export default router;
