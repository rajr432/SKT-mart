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
  topProducts: Array<{ productId: string; _sum: { quantity: number | null; price: number | null }; product?: { name: string; slug: string } }>;
  topVendors: Array<{ vendorId: string; _sum: { price: number | null; commission: number | null }; vendor?: { storeName: string; slug: string } }>;
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (token) api<Analytics>(`/api/admin/analytics?days=${days}`, { token }).then(setData);
  }, [token, days]);

  if (!data) return <div className="card p-6">Loading...</div>;

  const maxTotal = Math.max(1, ...data.daily.map((d) => d.total));

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-gray-500">Last {data.days} days</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="GMV" value={formatPaise(data.gmv)} />
        <Card label="Orders" value={String(data.orders)} />
        <Card label="Commission earned" value={formatPaise(data.commission)} />
        <Card label="Avg. order value" value={formatPaise(data.orders ? data.gmv / data.orders : 0)} />
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Daily GMV</h2>
        <div className="flex items-end gap-1 h-40 border-b border-gray-200">
          {data.daily.map((d, i) => (
            <div
              key={i}
              title={`${new Date(d.date).toLocaleDateString()} — ${formatPaise(d.total)} (${d.orders} orders)`}
              className="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
              style={{ height: `${(d.total / maxTotal) * 100}%` }}
            />
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Top Products</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.productId} className="border-b">
                  <td className="py-2">{p.product?.name ?? p.productId.slice(0, 8)}</td>
                  <td className="text-right text-xs">{p._sum.quantity ?? 0} sold</td>
                  <td className="text-right text-xs">{formatPaise(p._sum.price ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Top Vendors</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.topVendors.map((v) => (
                <tr key={v.vendorId} className="border-b">
                  <td className="py-2">{v.vendor?.storeName ?? v.vendorId.slice(0, 8)}</td>
                  <td className="text-right text-xs">{formatPaise(v._sum.price ?? 0)} GMV</td>
                  <td className="text-right text-xs">{formatPaise(v._sum.commission ?? 0)} comm.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="card p-4">
        <button className="btn-primary" onClick={() => downloadOrdersCsv(token)}>
          Download Orders CSV
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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
