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

const STATUS_TONE: Record<string, string> = {
  PLACED: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200",
  PACKED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-700 border-violet-200",
  OUT_FOR_DELIVERY: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<O[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await api<{ items: O[] }>("/api/admin/orders", { token });
      setItems(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const setStatus = async (id: string, status: string) => {
    await api(`/api/admin/orders/${id}/status`, { token, method: "PATCH", json: { status } });
    load();
  };

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Commerce</p>
          <h2 className="font-display text-2xl tracking-tightest">Orders</h2>
        </div>
        {!loading && (
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {items.length} order{items.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-6 w-6"
            >
              <path d="m3 7 9-4 9 4-9 4-9-4Z" />
              <path d="M3 7v10l9 4 9-4V7" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No orders yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Order</Th>
                  <Th>Buyer</Th>
                  <Th>Items</Th>
                  <Th>Total</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((o) => (
                  <tr key={o.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium tracking-tight">{o.orderNumber}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(o.placedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.user.name}</td>
                    <td className="px-4 py-3 text-gray-700">{o.items.length}</td>
                    <td className="px-4 py-3 font-medium tracking-tight">
                      {formatPaise(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer ${
                          STATUS_TONE[o.status] ||
                          "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                        defaultValue={o.status}
                        onChange={(e) => setStatus(o.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-xs uppercase tracking-wider text-accent hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2.5">
            {items.map((o) => (
              <Link
                href={`/admin/orders/${o.id}`}
                key={o.id}
                className="block rounded-2xl border border-gray-100 p-4 hover:border-accent/40 hover:bg-violet-50/30 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium tracking-tight truncate">{o.orderNumber}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {o.user.name} · {o.items.length} item
                      {o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-display text-base tracking-tight shrink-0">
                    {formatPaise(o.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      STATUS_TONE[o.status] ||
                      "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      o.paymentStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {o.paymentStatus}
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {new Date(o.placedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
