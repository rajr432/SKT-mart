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

export default function AdminPayoutsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Payout[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [form, setForm] = useState({ vendorId: "", start: "", end: "" });
  const [utr, setUtr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const [p, v] = await Promise.all([
      api<{ items: Payout[] }>("/api/payouts/", { token }),
      api<{ items: VendorRow[] }>("/api/admin/vendors", { token }),
    ]);
    setItems(p.items);
    setVendors(v.items);
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

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Vendor Payouts</h1>
        <p className="text-sm text-gray-500">
          Net = Sales − Commission − Refunds − Ad Spend. "Mark Paid" credits vendor wallet.
        </p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Generate Payout</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <select
            value={form.vendorId}
            onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.storeName} (wallet {formatPaise(v.walletBalance)})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <button onClick={generate} className="btn-primary">Generate</button>
        </div>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </section>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            placeholder="Enter bank UTR to mark paid"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Vendor</th>
              <th>Period</th>
              <th>Gross</th>
              <th>Commission</th>
              <th>Refunds</th>
              <th>Ad spend</th>
              <th>Net</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.vendor?.storeName}</td>
                <td>
                  {new Date(p.periodStart).toLocaleDateString()} –{" "}
                  {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td>{formatPaise(p.grossSales)}</td>
                <td>-{formatPaise(p.totalCommission)}</td>
                <td>-{formatPaise(p.totalRefunds)}</td>
                <td>-{formatPaise(p.totalAdSpend)}</td>
                <td className="font-semibold">{formatPaise(p.netAmount)}</td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      p.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : p.status === "FAILED"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td>
                  {p.status === "PENDING" && (
                    <button
                      onClick={() => markPaid(p.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark Paid
                    </button>
                  )}
                  {p.utr && <span className="text-[11px] text-gray-500">UTR: {p.utr}</span>}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  No payouts yet. Generate one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
