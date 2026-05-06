"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Payout } from "@/lib/types";

interface VendorRow {
  id: string;
  storeName: string;
  walletBalance: number;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminPayoutsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Payout[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [form, setForm] = useState({ vendorId: "", start: "", end: "" });
  const [utr, setUtr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [p, v] = await Promise.all([
        api<{ items: Payout[] }>("/api/payouts/", { token }),
        api<{ items: VendorRow[] }>("/api/admin/vendors", { token }),
      ]);
      setItems(p.items);
      setVendors(v.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function generate() {
    if (!form.vendorId || !form.start || !form.end) return;
    try {
      await api("/api/payouts/generate", {
        method: "POST",
        token,
        json: {
          vendorId: form.vendorId,
          periodStart: new Date(form.start).toISOString(),
          periodEnd: new Date(form.end).toISOString(),
        },
      });
      setMsg("Generated ✓");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function markPaid(id: string) {
    if (!utr) return alert("Enter UTR first");
    await api(`/api/payouts/${id}/mark-paid`, { method: "POST", token, json: { utr } });
    setUtr("");
    load();
  }

  const inputCls =
    "rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Commerce</p>
        <h1 className="font-display text-2xl tracking-tightest">Vendor payouts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Net = Sales − Commission − Refunds − Ad spend. "Mark paid" credits vendor wallet.
        </p>
      </div>

      <section className="card-premium p-5 sm:p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Generate payout</p>
        <h2 className="font-display text-lg tracking-tight">Period summary</h2>
        <div className="grid md:grid-cols-4 gap-2.5">
          <select
            value={form.vendorId}
            onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
            className={inputCls}
          >
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.storeName} ({formatPaise(v.walletBalance)})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            className={inputCls}
          />
          <input
            type="date"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
            className={inputCls}
          />
          <button onClick={generate} className="btn-primary btn-pill">
            Generate
          </button>
        </div>
        {msg && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm p-3">
            {msg}
          </p>
        )}
      </section>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Ledger</p>
            <h2 className="font-display text-2xl tracking-tightest">All payouts</h2>
          </div>
          <input
            placeholder="Bank UTR (paste before Mark paid)"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className="rounded-full border border-gray-100 bg-gray-50/60 px-4 py-2 text-sm outline-none focus:border-accent/40 focus:bg-white transition w-full sm:w-72"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
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
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M16 13.5h2.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No payouts yet. Generate one above.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 text-left">
                    <Th>Vendor</Th>
                    <Th>Period</Th>
                    <Th>Gross</Th>
                    <Th>Commission</Th>
                    <Th>Refunds</Th>
                    <Th>Ad spend</Th>
                    <Th>Net</Th>
                    <Th>Status</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((p) => (
                    <tr key={p.id} className="hover:bg-violet-50/30 transition">
                      <td className="px-4 py-3 tracking-tight">{p.vendor?.storeName}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {new Date(p.periodStart).toLocaleDateString()} –{" "}
                        {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 tracking-tight">{formatPaise(p.grossSales)}</td>
                      <td className="px-4 py-3 text-rose-600">
                        −{formatPaise(p.totalCommission)}
                      </td>
                      <td className="px-4 py-3 text-rose-600">
                        −{formatPaise(p.totalRefunds)}
                      </td>
                      <td className="px-4 py-3 text-rose-600">
                        −{formatPaise(p.totalAdSpend)}
                      </td>
                      <td className="px-4 py-3 font-display tracking-tight">
                        {formatPaise(p.netAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            STATUS_TONE[p.status] ||
                            "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => markPaid(p.id)}
                            className="text-[10px] uppercase tracking-wider text-accent hover:underline"
                          >
                            Mark paid
                          </button>
                        )}
                        {p.utr && (
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                            UTR {p.utr}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-2.5">
              {items.map((p) => (
                <div key={p.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight truncate">
                        {p.vendor?.storeName}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(p.periodStart).toLocaleDateString()} –{" "}
                        {new Date(p.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-display text-lg tracking-tight shrink-0">
                      {formatPaise(p.netAmount)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    <span>Gross: {formatPaise(p.grossSales)}</span>
                    <span className="text-rose-600">
                      Comm: −{formatPaise(p.totalCommission)}
                    </span>
                    <span className="text-rose-600">
                      Refunds: −{formatPaise(p.totalRefunds)}
                    </span>
                    <span className="text-rose-600">
                      Ads: −{formatPaise(p.totalAdSpend)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        STATUS_TONE[p.status] ||
                        "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.utr && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        UTR {p.utr}
                      </span>
                    )}
                    {p.status === "PENDING" && (
                      <button
                        onClick={() => markPaid(p.id)}
                        className="ml-auto text-[10px] uppercase tracking-wider text-accent hover:underline"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
