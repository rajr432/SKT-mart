"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface OrderDetail {
  id: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  couponCode: string | null;
  notes: string | null;
  deliveryOtp: string | null;
  shiprocketOrderId: number | null;
  shiprocketShipmentId: number | null;
  placedAt: string;
  user: { id: string; name: string; email: string | null; phone: string | null };
  address: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    image: string | null;
    price: number;
    quantity: number;
    status: string;
    vendorId: string;
    vendor: { storeName: string };
    product: { slug: string };
  }>;
  payment: {
    razorpayPaymentId: string | null;
    status: string;
  } | null;
}

// Forward-progress states only — CANCELLED and RETURNED go through dedicated
// backend endpoints (POST /admin/orders/:id/cancel) that restock inventory,
// release coupon slots, and refund the customer wallet. The PATCH status
// route rejects those two zod values with a 400, so showing them here would
// produce a silent failure.
const STATUSES = [
  "PLACED", "CONFIRMED", "PACKED", "SHIPPED",
  "OUT_FOR_DELIVERY", "DELIVERED",
];
const TERMINAL = new Set(["CANCELLED", "RETURNED"]);

const statusColor: Record<string, string> = {
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-yellow-100 text-yellow-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-gray-100 text-gray-700",
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { order: o } = await api<{ order: OrderDetail }>(
        `/api/admin/orders/${id}`,
        { token },
      );
      setOrder(o);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) load();
  }, [token, id]);

  const setStatus = async (status: string) => {
    try {
      await api(`/api/admin/orders/${id}/status`, {
        token,
        method: "PATCH",
        json: { status },
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Cancel this order? Stock will be restocked and paid amount refunded to the customer's wallet."))
      return;
    try {
      await api(`/api/admin/orders/${id}/cancel`, { token, method: "POST" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel order");
    }
  };

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Order not found</p>
        <Link href="/admin/orders" className="text-brand text-sm mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-xs text-brand hover:underline">
            &larr; All orders
          </Link>
          <h2 className="text-lg font-semibold">Order #{order.orderNumber}</h2>
          <p className="text-xs text-gray-500">
            Placed {new Date(order.placedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${statusColor[order.status] ?? "bg-gray-100"}`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
          <select
            className="input !w-auto !py-1 text-sm"
            value={TERMINAL.has(order.status) ? "" : order.status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={TERMINAL.has(order.status)}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {!TERMINAL.has(order.status) && order.status !== "DELIVERED" && (
            <button
              onClick={cancelOrder}
              className="text-xs px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2">Customer</h3>
          <p className="text-sm font-medium">{order.user.name}</p>
          {order.user.email && (
            <p className="text-xs text-gray-500">{order.user.email}</p>
          )}
          {order.user.phone && (
            <p className="text-xs text-gray-500">{order.user.phone}</p>
          )}
          <Link
            href={`/admin/users/${order.user.id}`}
            className="text-xs text-brand mt-1 inline-block"
          >
            View profile &rarr;
          </Link>
        </div>

        {/* Shipping Address */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2">Shipping Address</h3>
          <p className="text-sm">{order.address.name}</p>
          <p className="text-xs text-gray-600">
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
          </p>
          <p className="text-xs text-gray-600">
            {order.address.city}, {order.address.state} {order.address.pincode}
          </p>
          {order.address.phone && (
            <p className="text-xs text-gray-500 mt-1">{order.address.phone}</p>
          )}
        </div>

        {/* Payment */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2">Payment</h3>
          <p className="text-sm">
            <span className="font-medium">{order.paymentMethod}</span>
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                order.paymentStatus === "PAID"
                  ? "bg-green-100 text-green-700"
                  : order.paymentStatus === "REFUNDED"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {order.paymentStatus}
            </span>
          </p>
          {order.payment?.razorpayPaymentId && (
            <p className="text-xs text-gray-500 mt-1">
              Razorpay: {order.payment.razorpayPaymentId}
            </p>
          )}
          {order.couponCode && (
            <p className="text-xs text-gray-500 mt-1">
              Coupon: <span className="font-mono">{order.couponCode}</span>
            </p>
          )}
          {order.deliveryOtp && (
            <p className="text-xs mt-1">
              Delivery OTP:{" "}
              <span className="font-mono font-bold text-brand">
                {order.deliveryOtp}
              </span>
            </p>
          )}
          {order.shiprocketOrderId && (
            <p className="text-xs text-gray-500 mt-1">
              Shiprocket: #{order.shiprocketOrderId} / Shipment #{order.shiprocketShipmentId}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">
          Items ({order.items.length})
        </h3>
        <div className="space-y-3">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded"
            >
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image}
                  alt={it.name}
                  className="w-14 h-14 object-cover rounded border"
                />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${it.product.slug}`}
                  className="text-sm font-medium hover:text-brand line-clamp-1"
                >
                  {it.name}
                </Link>
                <p className="text-xs text-gray-500">
                  Vendor: {it.vendor.storeName} · Qty: {it.quantity}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  {formatPaise(it.price * it.quantity)}
                </p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor[it.status] ?? "bg-gray-100"}`}
                >
                  {it.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Summary</h3>
        <div className="max-w-xs ml-auto space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPaise(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPaise(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>
              {order.shippingFee === 0 ? "FREE" : formatPaise(order.shippingFee)}
            </span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatPaise(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span>{formatPaise(order.total)}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1">Notes</h3>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
