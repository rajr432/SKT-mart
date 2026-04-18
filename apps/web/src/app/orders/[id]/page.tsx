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

  const statuses = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
  const idx = statuses.indexOf(order.status);

  return (
    <div className="container-page py-6 space-y-4">
      <div className="card p-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-semibold">Order {order.orderNumber}</h1>
            <p className="text-xs text-gray-500">
              Placed on {new Date(order.placedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{formatPaise(order.total)}</p>
            <p className="text-xs">
              Payment: {order.paymentMethod} · {order.paymentStatus}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statuses.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                i <= idx ? "bg-brand-green text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {i <= idx ? "✓" : i + 1}. {s.replaceAll("_", " ")}
            </div>
          ))}
          {order.status === "CANCELLED" && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">CANCELLED</div>
          )}
        </div>
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
        <h3 className="font-medium mb-2">Items</h3>
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
