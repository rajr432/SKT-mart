"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface O {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  placedAt: string;
  user: { name: string };
  items: { id: string }[];
}

const STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<O[]>([]);

  const load = async () => {
    const { items } = await api<{ items: O[] }>("/api/admin/orders", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const setStatus = async (id: string, status: string) => {
    await api(`/api/admin/orders/${id}/status`, { token, method: "PATCH", json: { status } });
    load();
  };

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Orders</h2>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="py-2">Order #</th>
            <th>Buyer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2">
                {o.orderNumber}
                <div className="text-xs text-gray-500">
                  {new Date(o.placedAt).toLocaleDateString()}
                </div>
              </td>
              <td>{o.user.name}</td>
              <td>{o.items.length}</td>
              <td>{formatPaise(o.total)}</td>
              <td>{o.paymentStatus}</td>
              <td>
                <select
                  className="input !w-auto !py-1"
                  defaultValue={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-xs text-brand hover:underline"
                >
                  View &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
