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
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-yellow-100 text-yellow-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-gray-100 text-gray-700",
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
      <div className="card p-5 bg-gradient-to-r from-brand to-brand-green text-white">
        <h1 className="text-xl font-semibold">
          Welcome{user?.vendor ? `, ${user.vendor.storeName}` : ""} 👋
        </h1>
        {user?.vendor && (
          <p className="text-xs mt-1 opacity-90">
            Store status:{" "}
            <span className="font-semibold">
              {user.vendor.status}
            </span>
            {" · "}
            <Link
              href={`/store/${user.vendor.slug}`}
              className="underline hover:opacity-80"
            >
              View public storefront →
            </Link>
          </p>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-16" />
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
              icon="💰"
              color="from-green-500 to-emerald-600"
            />
            <Stat
              label="Net earnings"
              value={formatPaise(a.totals.netEarnings)}
              sub="after commission"
              icon="📈"
              color="from-blue-500 to-indigo-600"
            />
            <Stat
              label="Units sold"
              value={String(a.totals.units)}
              sub="last 30 days"
              icon="📦"
              color="from-purple-500 to-pink-600"
            />
            <Stat
              label="Low stock"
              value={String(a.lowStock.length)}
              sub="≤ 5 units"
              icon="⚠️"
              color="from-orange-500 to-red-600"
            />
          </div>

          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Quick actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Link
                href="/vendor/products/new"
                className="p-3 rounded-lg border hover:border-brand hover:bg-brand/5 text-center"
              >
                ➕ Add product
              </Link>
              <Link
                href="/vendor/orders"
                className="p-3 rounded-lg border hover:border-brand hover:bg-brand/5 text-center"
              >
                📋 Orders
              </Link>
              <Link
                href="/vendor/products"
                className="p-3 rounded-lg border hover:border-brand hover:bg-brand/5 text-center"
              >
                🛒 My products
              </Link>
              <Link
                href="/vendor/wallet"
                className="p-3 rounded-lg border hover:border-brand hover:bg-brand/5 text-center"
              >
                💳 Wallet & payouts
              </Link>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Revenue — last 30 days</h3>
              <span className="text-xs text-gray-500">
                {formatPaise(a.totals.revenue)} total
              </span>
            </div>
            {a.totals.revenue === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No sales in the last 30 days
              </p>
            ) : (
              <div className="flex items-end gap-0.5 h-28">
                {a.series.map((s) => (
                  <div
                    key={s.date}
                    className="flex-1 bg-gradient-to-t from-brand to-brand-green rounded-t hover:opacity-80 transition relative group min-h-[2px]"
                    style={{
                      height: `${(s.revenue / maxRev) * 100}%`,
                    }}
                    title={`${s.date}: ${formatPaise(s.revenue)} (${s.units} units)`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-black text-white px-1.5 py-0.5 rounded">
                      {s.date.slice(5)}: {formatPaise(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">🏆 Top products</h3>
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
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">⚠️ Low stock</h3>
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
                        className={`text-xs px-2 py-0.5 rounded ${p.stock === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}
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
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Recent orders</h3>
              <Link
                href="/vendor/orders"
                className="text-xs text-brand hover:underline"
              >
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
                            className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor[r.status] ?? "bg-gray-100"}`}
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
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: string;
}) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color ?? "from-brand to-brand-green"}`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500">{label}</p>
          <p className="text-xl font-semibold mt-1">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
