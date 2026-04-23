"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Coupon } from "@/lib/types";

// Admin coupon creator. All value fields are integers:
// - PERCENT: value = % off (1-100), maxDiscount = paise cap (optional)
// - FLAT: value = paise off directly, maxDiscount ignored
// minOrder + expiresAt + usageLimit + active are optional levers.
interface Form {
  code: string;
  title: string;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrder: number;
  maxDiscount: number | "";
  expiresAt: string; // yyyy-mm-ddThh:mm local, converted to ISO on submit
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

export default function AdminCouponsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { items } = await api<{ items: Coupon[] }>("/api/admin/coupons", { token });
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
    else body.expiresAt = null; // explicit clear on patch
    if (f.usageLimit !== "") body.usageLimit = Number(f.usageLimit);
    return body;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (editingId) {
        await api(`/api/admin/coupons/${editingId}`, {
          token,
          method: "PATCH",
          json: toPayload(form),
        });
      } else {
        await api("/api/admin/coupons", {
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
      usageLimit: (c as Coupon & { usageLimit?: number }).usageLimit ?? "",
      active: c.active ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (c: Coupon) => {
    await api(`/api/admin/coupons/${c.id}`, {
      token,
      method: "PATCH",
      json: { active: !c.active },
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon? Customers who have it saved will lose access.")) return;
    await api(`/api/admin/coupons/${id}`, { token, method: "DELETE" });
    load();
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coupons</h1>
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

      <form onSubmit={submit} className="card p-4 grid md:grid-cols-6 gap-3">
        <input
          className="input md:col-span-2"
          placeholder="Code (e.g. NEW10)"
          value={form.code}
          disabled={!!editingId}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />
        <input
          className="input md:col-span-4"
          placeholder="Title (e.g. Flat ₹100 off on first order)"
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
          className="input"
          type="number"
          min={1}
          placeholder={form.type === "PERCENT" ? "% off (1-100)" : "Paise off"}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          required
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Min order (paise)"
          value={form.minOrder}
          onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
        />
        {form.type === "PERCENT" ? (
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Max discount (paise)"
            value={form.maxDiscount}
            onChange={(e) =>
              setForm({
                ...form,
                maxDiscount: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        ) : (
          <div />
        )}
        <input
          className="input"
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          title="Expires at"
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Usage limit (blank = ∞)"
          value={form.usageLimit}
          onChange={(e) =>
            setForm({ ...form, usageLimit: e.target.value === "" ? "" : Number(e.target.value) })
          }
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>

        {err && <p className="md:col-span-6 text-xs text-red-600">{err}</p>}
        <button disabled={busy} className="btn-primary md:col-span-6 disabled:opacity-50">
          {busy ? "Saving…" : editingId ? "Update coupon" : "Add coupon"}
        </button>
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Min order</th>
                <th className="text-left p-3">Expires</th>
                <th className="text-left p-3">Used / Limit</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < now;
                const usageLimit = (c as Coupon & { usageLimit?: number }).usageLimit;
                const used = (c as Coupon & { usedCount?: number }).usedCount ?? 0;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-mono font-semibold">{c.code}</td>
                    <td className="p-3">{c.title}</td>
                    <td className="p-3">
                      {c.type === "PERCENT" ? (
                        <>
                          {c.value}%
                          {c.maxDiscount ? (
                            <span className="text-xs text-gray-500"> (max {formatPaise(c.maxDiscount)})</span>
                          ) : null}
                        </>
                      ) : (
                        formatPaise(c.value)
                      )}
                    </td>
                    <td className="p-3">{c.minOrder ? formatPaise(c.minOrder) : "—"}</td>
                    <td className="p-3 text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleString() : "Never"}
                    </td>
                    <td className="p-3 text-xs">
                      {used} / {usageLimit ?? "∞"}
                    </td>
                    <td className="p-3 text-xs">
                      {!c.active ? (
                        <span className="text-gray-500">Paused</span>
                      ) : expired ? (
                        <span className="text-red-600">Expired</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => edit(c)} className="text-brand-blue text-xs">
                        Edit
                      </button>
                      <button onClick={() => toggle(c)} className="text-amber-600 text-xs">
                        {c.active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => del(c.id)} className="text-red-600 text-xs">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-gray-500">
                    No coupons yet. Create your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
