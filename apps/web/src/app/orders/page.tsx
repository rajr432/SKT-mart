"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/orders");
      return;
    }
    (async () => {
      const { items } = await api<{ items: Order[] }>("/api/orders", { token });
      setOrders(items);
      setLoading(false);
    })();
  }, [ready, token]);

  if (loading) return <div className="container-page py-8">Loading…</div>;

  return (
    <div className="container-page py-6">
      <h1 className="text-xl font-semibold mb-4">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card p-10 text-center">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link href={`/orders/${o.id}`} key={o.id} className="card p-4 flex justify-between hover:shadow-md">
              <div>
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-xs text-gray-500">
                  Placed on {new Date(o.placedAt).toLocaleDateString()}
                </p>
                <p className="text-sm mt-1">{o.items.length} items</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPaise(o.total)}</p>
                <p className="text-xs mt-1">
                  <span className="bg-blue-100 text-brand px-2 py-0.5 rounded">{o.status}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
