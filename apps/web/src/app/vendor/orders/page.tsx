"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface VendorOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
  order: {
    id: string;
    orderNumber: string;
    placedAt: string;
    address: { name: string; city: string; pincode: string };
    user: { name: string };
  };
}

const NEXT: Record<string, string | null> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
};

export default function VendorOrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<VendorOrderItem[]>([]);

  const load = async () => {
    const { items } = await api<{ items: VendorOrderItem[] }>("/api/vendor/orders", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const advance = async (id: string, next: string) => {
    await api(`/api/vendor/orders/${id}/status`, {
      token,
      method: "PATCH",
      json: { status: next },
    });
    load();
  };

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Orders to fulfill</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="py-2">Order</th>
              <th>Item</th>
              <th>Buyer</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">
                  {it.order.orderNumber}
                  <div className="text-xs text-gray-500">
                    {new Date(it.order.placedAt).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  {it.name} × {it.quantity}
                </td>
                <td>
                  {it.order.user.name}
                  <div className="text-xs text-gray-500">
                    {it.order.address.city} — {it.order.address.pincode}
                  </div>
                </td>
                <td>{formatPaise(it.price * it.quantity)}</td>
                <td>{it.status}</td>
                <td>
                  {NEXT[it.status] && (
                    <button
                      onClick={() => advance(it.id, NEXT[it.status]!)}
                      className="text-brand text-xs"
                    >
                      Mark {NEXT[it.status]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
