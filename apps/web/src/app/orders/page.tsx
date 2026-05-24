"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Order } from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  PLACED: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200",
  PACKED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-700 border-violet-200",
  OUT_FOR_DELIVERY: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

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
      try {
        const { items } = await api<{ items: Order[] }>("/api/orders", { token });
        setOrders(items);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, token, router]);

  return (
    <div className="container-page py-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tightest">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track shipments, request returns, view receipts.
          </p>
        </div>
        {!loading && orders.length > 0 && (
          <span className="text-xs text-gray-500">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-premium p-5 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-24 h-2" />
                <div className="skeleton-line w-16 h-2" />
              </div>
              <div className="w-24 space-y-2">
                <div className="skeleton-line w-20 h-4 ml-auto" />
                <div className="skeleton-line w-14 h-2 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-accent">
              <path
                d="M3 6h18l-1.5 11a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 6Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 6V5a3 3 0 1 1 6 0v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="font-display text-lg tracking-tightest">No orders yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Start exploring — your future deliveries will appear here.
          </p>
          <Link href="/" className="btn-primary btn-pill mt-5">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const tone =
              STATUS_TONE[o.status] || "bg-gray-50 text-gray-700 border-gray-200";
            return (
              <Link
                href={`/orders/${o.id}`}
                key={o.id}
                className="card-premium p-5 flex items-center justify-between gap-4 hover:shadow-soft transition group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium tracking-tight truncate">{o.orderNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Placed on{" "}
                    {new Date(o.placedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600 mt-1.5">
                    {o.items.length} item{o.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-lg tracking-tight">
                    {formatPaise(o.total)}
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${tone}`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-gray-300 group-hover:text-accent transition" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
