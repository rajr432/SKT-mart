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
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Pincode Serviceability</h1>
        <p className="text-sm text-gray-500">
          Manage delivery ETA & serviceable zones. Customers see this on PDP & checkout.
        </p>
      </div>

      <form onSubmit={save} className="card p-4 grid md:grid-cols-5 gap-3">
        <input
          className="input"
          placeholder="Pincode (6 digits)"
          value={form.pincode}
          maxLength={6}
          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
          required
        />
        <input
          className="input"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="ETA days"
          value={form.etaDays}
          onChange={(e) => setForm({ ...form, etaDays: Number(e.target.value) })}
          min={1}
          max={30}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.serviceable}
            onChange={(e) => setForm({ ...form, serviceable: e.target.checked })}
          />
          Serviceable
        </label>
        <button className="btn-primary md:col-span-5">Add / Update</button>
      </form>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Bulk upload (CSV)</h2>
        <p className="text-xs text-gray-500 mb-2">
          Format per line: <code>pincode,city,state,etaDays</code>. Up to 5000 rows.
        </p>
        <textarea
          className="input w-full h-32 font-mono text-xs"
          placeholder="110001,New Delhi,Delhi,3&#10;400001,Mumbai,Maharashtra,2"
          value={bulkCsv}
          onChange={(e) => setBulkCsv(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={bulkUpload} className="btn-primary">Upload</button>
          <span className="text-sm text-green-600">{bulkMsg}</span>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            className="input flex-1"
            placeholder="Search pincode / city / state"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={load} className="btn-outline">Search</button>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500">No pincodes configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1">Pincode</th>
                  <th>City</th>
                  <th>State</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.pincode} className="border-t">
                    <td className="py-1 font-mono">{p.pincode}</td>
                    <td>{p.city}</td>
                    <td>{p.state}</td>
                    <td>{p.etaDays}d</td>
                    <td>
                      <span
                        className={
                          p.serviceable
                            ? "text-green-700 text-xs"
                            : "text-red-600 text-xs"
                        }
                      >
                        {p.serviceable ? "Serviceable" : "Non-serviceable"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => del(p.pincode)}
                        className="text-red-600 text-xs"
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
