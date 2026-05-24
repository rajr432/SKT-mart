"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface Pincode {
  pincode: string;
  city: string;
  state: string;
  serviceable: boolean;
  etaDays: number;
}

const inputCls =
  "w-full rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

export default function AdminPincodesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Pincode[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Pincode>({
    pincode: "",
    city: "",
    state: "",
    serviceable: true,
    etaDays: 5,
  });
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const { items } = await api<{ items: Pincode[] }>(
      `/api/admin/pincodes${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      { token },
    );
    setItems(items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/admin/pincodes", { token, method: "POST", json: form });
    setForm({ pincode: "", city: "", state: "", serviceable: true, etaDays: 5 });
    load();
  };

  const del = async (p: string) => {
    if (!confirm(`Delete pincode ${p}?`)) return;
    await api(`/api/admin/pincodes/${p}`, { token, method: "DELETE" });
    load();
  };

  const bulkUpload = async () => {
    setBulkMsg("");
    const lines = bulkCsv.trim().split(/\r?\n/).filter(Boolean);
    const rows: Pincode[] = [];
    for (const line of lines) {
      const [pincode, city, state, etaStr] = line.split(",").map((s) => s.trim());
      if (!pincode || !city || !state) continue;
      rows.push({
        pincode,
        city,
        state,
        serviceable: true,
        etaDays: Number(etaStr) || 5,
      });
    }
    if (!rows.length) return setBulkMsg("No valid rows.");
    try {
      const r = await api<{ inserted: number; updated: number; total: number }>(
        "/api/admin/pincodes/bulk",
        { token, method: "POST", json: { rows } },
      );
      setBulkMsg(`${r.inserted} inserted, ${r.updated} updated (${r.total} total)`);
      setBulkCsv("");
      load();
    } catch (e) {
      setBulkMsg((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Logistics</p>
        <h1 className="font-display text-2xl tracking-tightest">Pincode serviceability</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage delivery ETA &amp; serviceable zones. Customers see this on PDP &amp;
          checkout.
        </p>
      </div>

      <form onSubmit={save} className="card-premium p-5 sm:p-6 grid md:grid-cols-5 gap-3">
        <input
          className={`${inputCls} font-mono`}
          placeholder="Pincode (6 digits)"
          value={form.pincode}
          maxLength={6}
          onChange={(e) =>
            setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })
          }
          required
        />
        <input
          className={inputCls}
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          required
        />
        <input
          className={inputCls}
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          required
        />
        <input
          className={inputCls}
          type="number"
          placeholder="ETA days"
          value={form.etaDays}
          onChange={(e) => setForm({ ...form, etaDays: Number(e.target.value) })}
          min={1}
          max={30}
        />
        <label className="flex items-center gap-2 text-sm px-1">
          <input
            type="checkbox"
            checked={form.serviceable}
            onChange={(e) => setForm({ ...form, serviceable: e.target.checked })}
            className="accent-accent h-4 w-4"
          />
          <span className="text-gray-700">Serviceable</span>
        </label>
        <button className="btn-primary btn-pill md:col-span-5">Add / Update</button>
      </form>

      <div className="card-premium p-5 sm:p-6">
        <h2 className="font-display text-lg tracking-tightest">Bulk upload (CSV)</h2>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1 mb-3">
          Format per line: <code className="font-mono">pincode,city,state,etaDays</code>{" "}
          · up to 5000 rows
        </p>
        <textarea
          className={`${inputCls} h-32 font-mono text-[12px] resize-none`}
          placeholder="110001,New Delhi,Delhi,3&#10;400001,Mumbai,Maharashtra,2"
          value={bulkCsv}
          onChange={(e) => setBulkCsv(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button onClick={bulkUpload} className="btn-primary btn-pill">
            Upload
          </button>
          {bulkMsg && (
            <span className="text-sm text-emerald-600">{bulkMsg}</span>
          )}
        </div>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Library</p>
            <h2 className="font-display text-2xl tracking-tightest">All pincodes</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="rounded-full border border-gray-100 bg-gray-50/60 pl-10 pr-4 py-2 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
                placeholder="Search pincode / city / state"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <button onClick={load} className="btn-outline btn-pill text-xs">
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-12 w-full rounded-2xl" />
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
                <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No pincodes configured yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Pincode</Th>
                  <Th>City</Th>
                  <Th>State</Th>
                  <Th>ETA</Th>
                  <Th>Status</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p) => (
                  <tr key={p.pincode} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-3 font-mono font-semibold tracking-tight">
                      {p.pincode}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.city}</td>
                    <td className="px-4 py-3 text-gray-700">{p.state}</td>
                    <td className="px-4 py-3 text-accent">{p.etaDays}d</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          p.serviceable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {p.serviceable ? "Serviceable" : "Non-serviceable"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => del(p.pincode)}
                        className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
