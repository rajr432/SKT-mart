"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Coupon } from "@/lib/types";

// Vendor-scoped coupon CRUD. Backend attaches vendorId automatically on create
// and enforces scope on patch/delete via updateMany + count check — so the UI
// doesn't need to send or hide any vendor fields.
interface Form {
  code: string;
  title: string;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrder: number;
  maxDiscount: number | "";
  expiresAt: string;
  usageLimit: number | "";
  active: boolean;
}

const EMPTY: Form = {
  code: "",
  title: "",
  type: "PERCENT",
  value: 10,
  minOrder: 0,
  maxDiscount: "",
  expiresAt: "",
  usageLimit: "",
  active: true,
};

export default function VendorCouponsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { items } = await api<{ items: Coupon[] }>("/api/vendor/coupons", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toPayload = (f: Form) => {
    const body: Record<string, unknown> = {
      title: f.title,
      type: f.type,
      value: f.value,
      minOrder: f.minOrder,
      active: f.active,
    };
    if (f.type === "PERCENT" && f.maxDiscount !== "") body.maxDiscount = Number(f.maxDiscount);
    if (f.expiresAt) body.expiresAt = new Date(f.expiresAt).toISOString();
    else body.expiresAt = null;
    if (f.usageLimit !== "") body.usageLimit = Number(f.usageLimit);
    return body;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (editingId) {
        await api(`/api/vendor/coupons/${editingId}`, {
          token,
          method: "PATCH",
          json: toPayload(form),
        });
      } else {
        await api("/api/vendor/coupons", {
          token,
          method: "POST",
          json: { ...toPayload(form), code: form.code.toUpperCase().trim() },
        });
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      title: c.title,
      type: c.type as "PERCENT" | "FLAT",
      value: c.value,
      minOrder: c.minOrder ?? 0,
      maxDiscount: c.maxDiscount ?? "",
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : "",
      usageLimit: c.usageLimit ?? "",
      active: c.active ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (c: Coupon) => {
    await api(`/api/vendor/coupons/${c.id}`, {
      token,
      method: "PATCH",
      json: { active: !c.active },
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon? Customers with it saved will lose access.")) return;
    await api(`/api/vendor/coupons/${id}`, { token, method: "DELETE" });
    load();
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Store coupons</h1>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY);
            }}
            className="text-sm text-gray-500 underline"
          >
            Cancel edit
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Coupons you create here apply only to your own products. Customers can enter them at
        checkout — platform-wide coupons (created by admin) still work as usual.
      </p>

      <form onSubmit={submit} className="card p-4 grid md:grid-cols-6 gap-3">
        <input
          className="input md:col-span-2"
          placeholder="Code (e.g. STORE10)"
          value={form.code}
          disabled={!!editingId}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />
        <input
          className="input md:col-span-4"
          placeholder="Title (shown to customers)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <select
          className="input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FLAT" })}
        >
          <option value="PERCENT">Percent off</option>
          <option value="FLAT">Flat (paise)</option>
        </select>
        <input
          type="number"
          className="input"
          min={1}
          placeholder={form.type === "PERCENT" ? "% off (1-90)" : "paise off"}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          required
        />
        <input
          type="number"
          className="input"
          min={0}
          placeholder="Min order (paise)"
          value={form.minOrder}
          onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
        />
        {form.type === "PERCENT" && (
          <input
            type="number"
            className="input"
            min={1}
            placeholder="Max discount (paise, optional)"
            value={form.maxDiscount}
            onChange={(e) =>
              setForm({
                ...form,
                maxDiscount: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        )}
        <input
          type="datetime-local"
          className="input"
          placeholder="Expires at"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <input
          type="number"
          className="input"
          min={1}
          placeholder="Usage limit (optional)"
          value={form.usageLimit}
          onChange={(e) =>
            setForm({
              ...form,
              usageLimit: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
        />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active (customers can use it)
        </label>

        <div className="md:col-span-6 flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving..." : editingId ? "Save changes" : "Create coupon"}
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Title</th>
              <th className="p-3">Value</th>
              <th className="p-3">Min order</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Used / limit</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < now;
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono">{c.code}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">
                    {c.type === "PERCENT"
                      ? `${c.value}%${c.maxDiscount ? ` (max ${formatPaise(c.maxDiscount)})` : ""}`
                      : formatPaise(c.value)}
                  </td>
                  <td className="p-3">{c.minOrder ? formatPaise(c.minOrder) : "—"}</td>
                  <td className="p-3">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    {(c.usedCount ?? 0)}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="p-3">
                    {expired ? (
                      <span className="text-xs px-2 py-1 rounded bg-gray-200">Expired</span>
                    ) : c.active ? (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        Paused
                      </span>
                    )}
                  </td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => edit(c)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className="text-gray-600 hover:underline"
                    >
                      {c.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => del(c.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-400" colSpan={8}>
                  No coupons yet. Create one above to start rewarding repeat customers.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
