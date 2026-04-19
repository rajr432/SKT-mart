"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const { order } = await api<{ order: Order }>(`/api/orders/${params.id}`, { token });
        setOrder(order);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, token, params.id]);

  if (loading) return <div className="container-page py-8">Loading…</div>;
  if (!order) return <div className="container-page py-8">Order not found</div>;

  const statuses: { key: string; label: string; icon: string }[] = [
    { key: "PLACED", label: "Order Placed", icon: "📝" },
    { key: "CONFIRMED", label: "Confirmed", icon: "✅" },
    { key: "PACKED", label: "Packed", icon: "📦" },
    { key: "SHIPPED", label: "Shipped", icon: "🚚" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🏃" },
    { key: "DELIVERED", label: "Delivered", icon: "🎉" },
  ];
  const idx = statuses.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "CANCELLED";

  // ETA = placedAt + 5 days if not delivered yet
  const eta = new Date(new Date(order.placedAt).getTime() + 5 * 86400_000);
  const etaText = idx >= 5 ? "Delivered" : isCancelled ? "—" : eta.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="container-page py-6 space-y-4">
      <div className="card p-5">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">Order {order.orderNumber}</h1>
            <p className="text-xs text-gray-500">Placed on {new Date(order.placedAt).toLocaleString()}</p>
            <p className="text-xs text-gray-700 mt-1">
              Expected delivery: <span className="font-medium">{etaText}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{formatPaise(order.total)}</p>
            <p className="text-xs">Payment: {order.paymentMethod} · <span className={order.paymentStatus === "PAID" ? "text-brand-green" : "text-orange-600"}>{order.paymentStatus}</span></p>
          </div>
        </div>

        {isCancelled ? (
          <div className="mt-5 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            <div className="font-semibold">Order Cancelled</div>
            <div className="text-xs mt-1">Refund has been credited to your wallet (if payment was captured).</div>
          </div>
        ) : (
          <>
            {/* Desktop: horizontal tracker */}
            <div className="hidden md:block mt-6">
              <div className="relative flex justify-between">
                <div className="absolute top-5 left-8 right-8 h-1 bg-gray-200 rounded-full" />
                <div
                  className="absolute top-5 left-8 h-1 bg-gradient-to-r from-brand to-brand-green rounded-full transition-all duration-700"
                  style={{ width: `calc(${idx === 0 ? 0 : (idx / (statuses.length - 1)) * 100}% - ${idx === 0 ? 0 : 16}px)` }}
                />
                {statuses.map((s, i) => (
                  <div key={s.key} className="relative flex flex-col items-center flex-1 z-10">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-lg transition-all ${
                        i <= idx
                          ? "bg-gradient-to-br from-brand to-brand-green text-white shadow-lg scale-110"
                          : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                      } ${i === idx ? "ring-4 ring-brand/20 animate-pulse-soft" : ""}`}
                    >
                      {i < idx ? "✓" : s.icon}
                    </div>
                    <div className={`mt-2 text-xs text-center ${i <= idx ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden mt-5 space-y-3">
              {statuses.map((s, i) => (
                <div key={s.key} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-sm ${
                        i <= idx ? "bg-gradient-to-br from-brand to-brand-green text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                      } ${i === idx ? "ring-2 ring-brand/30" : ""}`}
                    >
                      {i < idx ? "✓" : s.icon}
                    </div>
                    {i < statuses.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-5 ${i < idx ? "bg-brand-green" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className={`text-sm font-medium ${i <= idx ? "text-gray-900" : "text-gray-400"}`}>{s.label}</div>
                    {i === idx && <div className="text-xs text-brand mt-0.5">Current status · Live tracking</div>}
                    {i < idx && <div className="text-xs text-gray-500 mt-0.5">Completed</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-medium mb-2">Shipping Address</h3>
          <p className="text-sm">
            {order.address.name} · {order.address.phone}
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
            <br />
            {order.address.city}, {order.address.state} — {order.address.pincode}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium mb-2">Price Details</h3>
          <div className="text-sm flex justify-between">
            <span>Subtotal</span>
            <span>{formatPaise(order.subtotal)}</span>
          </div>
          <div className="text-sm flex justify-between text-brand-green">
            <span>Discount</span>
            <span>− {formatPaise(order.discount)}</span>
          </div>
          <div className="text-sm flex justify-between">
            <span>Shipping</span>
            <span>{order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)}</span>
          </div>
          <div className="border-t my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPaise(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Items</h3>
          <button
            onClick={async () => {
              try {
                for (const it of order.items) {
                  await api("/api/cart", {
                    token: token!,
                    method: "POST",
                    json: { productId: it.productId, quantity: it.quantity },
                  });
                }
                router.push("/cart");
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="text-xs bg-brand text-white px-3 py-1.5 rounded-md hover:bg-brand-dark"
          >
            🔄 Reorder all
          </button>
        </div>
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between items-start text-sm py-2 border-b last:border-0">
            <div>
              <p>{it.name}</p>
              <p className="text-xs text-gray-500">Qty: {it.quantity}</p>
            </div>
            <div className="text-right">
              <p>{formatPaise(it.price * it.quantity)}</p>
              <p className="text-xs text-gray-500">{it.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
