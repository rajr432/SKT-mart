"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Analytics {
  period: { days: number; since: string };
  totals: { revenue: number; netEarnings: number; units: number; orders: number };
  series: Array<{ date: string; revenue: number; units: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    status: string;
    order: {
      id: string;
      orderNumber: string;
      placedAt: string;
      user: { name: string };
    };
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    units: number;
    revenue: number;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
    price: number;
  }>;
}

const statusColor: Record<string, string> = {
  PLACED: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border border-sky-200",
  PACKED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-700 border border-violet-200",
  OUT_FOR_DELIVERY: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border border-rose-200",
  RETURNED: "bg-gray-50 text-gray-700 border border-gray-200",
};

export default function VendorDashboard() {
  const { token, user } = useAuth();
  const [a, setA] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<Analytics>("/api/vendor/analytics", { token })
      .then(setA)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  const maxRev = a ? Math.max(1, ...a.series.map((s) => s.revenue)) : 1;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-7 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Vendor dashboard</p>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tightest mt-1">
            Welcome{user?.vendor ? `, ${user.vendor.storeName}` : ""}
          </h1>
          {user?.vendor && (
            <p className="text-xs mt-2 opacity-90">
              Status:{" "}
              <span className="font-semibold">{user.vendor.status}</span>
              {" · "}
              <Link
                href={`/store/${user.vendor.slug}`}
                className="underline underline-offset-4 hover:opacity-80"
              >
                View public storefront →
              </Link>
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium p-4">
              <div className="skeleton-line w-20 h-2 mb-3" />
              <div className="skeleton-line w-24 h-5" />
            </div>
          ))}
        </div>
      )}

      {a && (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Revenue (30d)"
              value={formatPaise(a.totals.revenue)}
              sub={`${a.totals.orders} items`}
              accent="from-violet-500 to-fuchsia-500"
            />
            <Stat
              label="Net earnings"
              value={formatPaise(a.totals.netEarnings)}
              sub="after commission"
              accent="from-fuchsia-500 to-rose-500"
            />
            <Stat
              label="Units sold"
              value={String(a.totals.units)}
              sub="last 30 days"
              accent="from-rose-500 to-amber-500"
            />
            <Stat
              label="Low stock"
              value={String(a.lowStock.length)}
              sub="≤ 5 units"
              accent="from-amber-500 to-violet-500"
            />
          </div>

          {/* Quick actions */}
          <div className="card-premium p-5">
            <h3 className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-4">Quick actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { href: "/vendor/products/new", label: "Add product", icon: "plus" as const },
                { href: "/vendor/orders", label: "Orders", icon: "orders" as const },
                { href: "/vendor/products", label: "My products", icon: "box" as const },
                { href: "/vendor/wallet", label: "Wallet & payouts", icon: "wallet" as const },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-accent/40 hover:bg-accent/5 transition"
                >
                  <span className="grid place-items-center h-10 w-10 rounded-2xl bg-violet-50 text-accent group-hover:bg-accent group-hover:text-white transition">
                    <QuickIcon name={q.icon} />
                  </span>
                  <span className="font-medium tracking-tight">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Revenue chart */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-base tracking-tight">Revenue</h3>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mt-0.5">Last 30 days</p>
              </div>
              <span className="font-display text-lg tracking-tight text-accent">
                {formatPaise(a.totals.revenue)}
              </span>
            </div>
            {a.totals.revenue === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No sales in the last 30 days
              </p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {a.series.map((s) => (
                  <div
                    key={s.date}
                    className="flex-1 bg-gradient-to-t from-violet-500 to-fuchsia-400 rounded-t-lg hover:opacity-90 transition relative group min-h-[2px]"
                    style={{ height: `${(s.revenue / maxRev) * 100}%` }}
                    title={`${s.date}: ${formatPaise(s.revenue)} (${s.units} units)`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-gray-900 text-white px-2 py-1 rounded-full">
                      {s.date.slice(5)}: {formatPaise(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="card-premium p-5">
              <h3 className="font-display text-base tracking-tight mb-4">Top products</h3>
              {a.topProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No sales yet.</p>
              ) : (
                <ul className="space-y-2">
                  {a.topProducts.map((p, i) => (
                    <li
                      key={p.productId}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-6 text-center text-gray-400 font-mono">
                        #{i + 1}
                      </span>
                      <span className="flex-1 truncate" title={p.name}>
                        {p.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {p.units} units
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Low stock */}
            <div className="card-premium p-5">
              <h3 className="font-display text-base tracking-tight mb-4">Low stock</h3>
              {a.lowStock.length === 0 ? (
                <p className="text-sm text-gray-500">All products are in stock.</p>
              ) : (
                <ul className="space-y-2">
                  {a.lowStock.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Link
                        href={`/product/${p.slug}`}
                        className="flex-1 truncate hover:text-brand"
                        title={p.name}
                      >
                        {p.name}
                      </Link>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${p.stock === 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                      >
                        {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base tracking-tight">Recent orders</h3>
              <Link href="/vendor/orders" className="link-accent text-xs">
                View all →
              </Link>
            </div>
            {a.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500 border-b">
                    <tr>
                      <th className="py-2">Order</th>
                      <th>Item</th>
                      <th>Buyer</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.recentOrders.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-2 font-mono text-xs">
                          {r.order.orderNumber}
                        </td>
                        <td className="truncate max-w-[200px]">{r.name}</td>
                        <td className="text-xs">{r.order.user.name}</td>
                        <td>{r.quantity}</td>
                        <td>{formatPaise(r.price * r.quantity)}</td>
                        <td>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-gray-50 text-gray-700 border border-gray-200"}`}
                          >
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card-premium p-5 relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
          accent ?? "from-violet-500 to-fuchsia-500"
        }`}
      />
      <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="font-display text-2xl tracking-tight mt-1.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function QuickIcon({ name }: { name: "plus" | "orders" | "box" | "wallet" }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px]",
  };
  switch (name) {
    case "plus":
      return (
        <svg {...c}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "orders":
      return (
        <svg {...c}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "box":
      return (
        <svg {...c}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...c}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M16 13.5h2.5" />
          <path d="M3 9h13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H3" />
        </svg>
      );
  }
}
