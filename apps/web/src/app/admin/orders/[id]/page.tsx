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

const STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const TERMINAL = new Set(["CANCELLED", "RETURNED"]);

const STATUS_TONE: Record<string, string> = {
  PLACED: "bg-sky-50 text-sky-700 border-sky-200",
  CONFIRMED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PACKED: "bg-violet-50 text-violet-700 border-violet-200",
  SHIPPED: "bg-amber-50 text-amber-700 border-amber-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  RETURNED: "bg-gray-50 text-gray-600 border-gray-200",
};

const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (
      !confirm(
        "Cancel this order? Stock will be restocked and paid amount refunded to the customer's wallet.",
      )
    )
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
      <div className="space-y-5">
        <div className="card-premium p-5 sm:p-6 space-y-3">
          <div className="skeleton-shimmer h-5 w-40 rounded-full" />
          <div className="skeleton-shimmer h-4 w-24 rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-shimmer h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card-premium p-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-6 w-6"
          >
            <path d="M3 7h18l-2 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 7Z" />
            <path d="M8 7V5a4 4 0 1 1 8 0v2" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Order not found</p>
        <Link
          href="/admin/orders"
          className="text-accent text-sm mt-3 inline-block link-accent"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-accent transition"
          >
            ← All orders
          </Link>
          <h1 className="font-display text-2xl tracking-tightest mt-1">
            #{order.orderNumber}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Placed {new Date(order.placedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border font-medium ${
              STATUS_TONE[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
          <select
            className="rounded-full border border-gray-100 bg-gray-50/60 px-3.5 py-1.5 text-xs outline-none focus:border-accent/40 focus:bg-white transition disabled:opacity-50"
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
              className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Customer
          </p>
          <p className="font-medium tracking-tight mt-1">{order.user.name}</p>
          {order.user.email && (
            <p className="text-xs text-gray-500 mt-0.5">{order.user.email}</p>
          )}
          {order.user.phone && (
            <p className="text-xs text-gray-500 mt-0.5">{order.user.phone}</p>
          )}
          <Link
            href={`/admin/users/${order.user.id}`}
            className="text-xs text-accent mt-2 inline-block link-accent"
          >
            View profile →
          </Link>
        </div>

        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Shipping address
          </p>
          <p className="font-medium tracking-tight mt-1">{order.address.name}</p>
          <p className="text-xs text-gray-600 mt-0.5">
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

        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Payment
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-medium tracking-tight">
              {order.paymentMethod}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                PAYMENT_TONE[order.paymentStatus] ??
                "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
          {order.payment?.razorpayPaymentId && (
            <p className="text-[11px] text-gray-500 mt-1.5 font-mono break-all">
              Razorpay: {order.payment.razorpayPaymentId}
            </p>
          )}
          {order.couponCode && (
            <p className="text-xs text-gray-500 mt-1.5">
              Coupon:{" "}
              <span className="font-mono text-accent">{order.couponCode}</span>
            </p>
          )}
          {order.deliveryOtp && (
            <p className="text-xs mt-1.5">
              Delivery OTP:{" "}
              <span className="font-mono font-bold text-accent text-sm tracking-widest">
                {order.deliveryOtp}
              </span>
            </p>
          )}
          {order.shiprocketOrderId && (
            <p className="text-[11px] text-gray-500 mt-1.5">
              Shiprocket: #{order.shiprocketOrderId} / Shipment #
              {order.shiprocketShipmentId}
            </p>
          )}
        </div>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Items · {order.items.length}
        </p>
        <div className="mt-3 space-y-2">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-accent/30 hover:bg-violet-50/30 transition"
            >
              {it.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={it.image}
                  alt={it.name}
                  className="w-14 h-14 object-cover rounded-xl border border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100" />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${it.product.slug}`}
                  className="text-sm font-medium tracking-tight hover:text-accent line-clamp-1 transition"
                >
                  {it.name}
                </Link>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {it.vendor.storeName} · Qty {it.quantity}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-semibold tabular-nums">
                  {formatPaise(it.price * it.quantity)}
                </p>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    STATUS_TONE[it.status] ??
                    "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {it.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Summary
        </p>
        <div className="mt-3 max-w-sm ml-auto space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatPaise(order.subtotal)} />
          {order.discount > 0 && (
            <Row
              label="Discount"
              value={`-${formatPaise(order.discount)}`}
              tone="text-emerald-600"
            />
          )}
          <Row
            label="Shipping"
            value={
              order.shippingFee === 0 ? "FREE" : formatPaise(order.shippingFee)
            }
            tone={order.shippingFee === 0 ? "text-emerald-600" : ""}
          />
          {order.tax > 0 && <Row label="Tax" value={formatPaise(order.tax)} />}
          <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
              Total
            </span>
            <span className="font-display text-2xl tracking-tightest">
              {formatPaise(order.total)}
            </span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="card-premium p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Notes
          </p>
          <p className="text-sm text-gray-700 mt-1.5">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`flex justify-between ${tone}`}>
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
