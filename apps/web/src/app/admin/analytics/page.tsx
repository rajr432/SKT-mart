"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Analytics {
  days: number;
  orders: number;
  gmv: number;
  commission: number;
  daily: Array<{ date: string; total: number; orders: number }>;
  topProducts: Array<{
    productId: string;
    _sum: { quantity: number | null; price: number | null };
    product?: { name: string; slug: string };
  }>;
  topVendors: Array<{
    vendorId: string;
    _sum: { price: number | null; commission: number | null };
    vendor?: { storeName: string; slug: string };
  }>;
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (token)
      api<Analytics>(`/api/admin/analytics?days=${days}`, { token }).then(setData);
  }, [token, days]);

  if (!data)
    return (
      <div className="space-y-5">
        <div className="card-premium p-5 sm:p-6">
          <div className="skeleton-shimmer h-6 w-40 rounded-full" />
          <div className="skeleton-shimmer h-4 w-24 rounded-full mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 w-full rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-shimmer h-56 w-full rounded-2xl" />
      </div>
    );

  const maxTotal = Math.max(1, ...data.daily.map((d) => d.total));

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Insights
          </p>
          <h1 className="font-display text-2xl tracking-tightest">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Last {data.days} days</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-full border border-gray-100 bg-gray-50/60 px-4 py-2 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="GMV" value={formatPaise(data.gmv)} accent />
        <StatTile label="Orders" value={String(data.orders)} />
        <StatTile label="Commission" value={formatPaise(data.commission)} />
        <StatTile
          label="Avg. order value"
          value={formatPaise(data.orders ? data.gmv / data.orders : 0)}
        />
      </div>

      <section className="card-premium p-5 sm:p-6">
        <h2 className="font-display text-lg tracking-tightest mb-4">Daily GMV</h2>
        <div className="flex items-end gap-1 h-40 border-b border-gray-100">
          {data.daily.map((d, i) => (
            <div
              key={i}
              title={`${new Date(d.date).toLocaleDateString()} — ${formatPaise(
                d.total,
              )} (${d.orders} orders)`}
              className="flex-1 bg-gradient-to-t from-violet-400 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-600 transition-colors rounded-t-lg min-h-[2px]"
              style={{ height: `${(d.total / maxTotal) * 100}%` }}
            />
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="card-premium p-5 sm:p-6">
          <h2 className="font-display text-lg tracking-tightest mb-3">
            Top products
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topProducts.map((p) => (
                <li
                  key={p.productId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <span className="font-medium tracking-tight text-[13px] truncate flex-1">
                    {p.product?.name ?? p.productId.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {p._sum.quantity ?? 0}×
                  </span>
                  <span className="text-[11px] text-accent tabular-nums">
                    {formatPaise(p._sum.price ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-premium p-5 sm:p-6">
          <h2 className="font-display text-lg tracking-tightest mb-3">
            Top vendors
          </h2>
          {data.topVendors.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topVendors.map((v) => (
                <li
                  key={v.vendorId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <span className="font-medium tracking-tight text-[13px] truncate flex-1">
                    {v.vendor?.storeName ?? v.vendorId.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {formatPaise(v._sum.price ?? 0)} GMV
                  </span>
                  <span className="text-[11px] text-accent tabular-nums">
                    {formatPaise(v._sum.commission ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <button
          className="btn-primary btn-pill inline-flex items-center gap-2"
          onClick={() => downloadOrdersCsv(token)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-[18px] w-[18px]"
          >
            <path d="M12 4v12" />
            <path d="m6 10 6 6 6-6" />
            <path d="M5 20h14" />
          </svg>
          Download orders CSV
        </button>
      </div>
    </div>
  );
}

async function downloadOrdersCsv(token: string | null) {
  if (!token) return;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(base + "/api/admin/export/orders.csv", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    alert(`Failed to download CSV: ${res.status}`);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-premium p-4 ${
        accent
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-0"
          : ""
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-[0.22em] ${
          accent ? "text-white/80" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p className="font-display text-xl md:text-2xl tracking-tightest mt-1 break-words">
        {value}
      </p>
    </div>
  );
}
