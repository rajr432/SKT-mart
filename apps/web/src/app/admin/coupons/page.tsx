"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Coupon } from "@/lib/types";

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

const inputCls =
  "w-full rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

export default function AdminCouponsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await api<{ items: Coupon[] }>("/api/admin/coupons", { token });
      setItems(items);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Promotions</p>
            <h2 className="font-display text-2xl tracking-tightest">
              {editingId ? "Edit coupon" : "Create coupon"}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="text-[11px] uppercase tracking-wider text-gray-500 hover:text-accent"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={submit} className="grid md:grid-cols-6 gap-3">
          <input
            className={`${inputCls} md:col-span-2 font-mono`}
            placeholder="Code (e.g. NEW10)"
            value={form.code}
            disabled={!!editingId}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
          />
          <input
            className={`${inputCls} md:col-span-4`}
            placeholder="Title (e.g. Flat ₹100 off on first order)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <select
            className={inputCls}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as "PERCENT" | "FLAT" })
            }
          >
            <option value="PERCENT">Percent off</option>
            <option value="FLAT">Flat (paise)</option>
          </select>
          <input
            className={inputCls}
            type="number"
            min={1}
            placeholder={form.type === "PERCENT" ? "% off (1-100)" : "Paise off"}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            required
          />
          <input
            className={inputCls}
            type="number"
            min={0}
            placeholder="Min order (paise)"
            value={form.minOrder}
            onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
          />
          {form.type === "PERCENT" ? (
            <input
              className={inputCls}
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
            className={inputCls}
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            title="Expires at"
          />
          <input
            className={inputCls}
            type="number"
            min={0}
            placeholder="Usage limit (blank = ∞)"
            value={form.usageLimit}
            onChange={(e) =>
              setForm({
                ...form,
                usageLimit: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
          <label className="flex items-center gap-2 text-sm px-1">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-accent h-4 w-4"
            />
            <span className="text-gray-700">Active</span>
          </label>

          {err && (
            <p className="md:col-span-6 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">
              {err}
            </p>
          )}
          <button
            disabled={busy}
            className="btn-primary btn-pill md:col-span-6 disabled:opacity-50"
          >
            {busy ? "Saving…" : editingId ? "Update coupon" : "Add coupon"}
          </button>
        </form>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Library</p>
            <h2 className="font-display text-2xl tracking-tightest">All coupons</h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {items.length} total
          </span>
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
                <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
                <path d="M9 7v10" strokeDasharray="2 3" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              No coupons yet — create your first one above.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 text-left">
                    <Th>Code</Th>
                    <Th>Title</Th>
                    <Th>Value</Th>
                    <Th>Min order</Th>
                    <Th>Expires</Th>
                    <Th>Usage</Th>
                    <Th>Status</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((c) => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < now;
                    const usageLimit = (c as Coupon & { usageLimit?: number }).usageLimit;
                    const used = (c as Coupon & { usedCount?: number }).usedCount ?? 0;
                    return (
                      <tr key={c.id} className="hover:bg-violet-50/30 transition">
                        <td className="px-4 py-3 font-mono font-semibold tracking-tight">
                          {c.code}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{c.title}</td>
                        <td className="px-4 py-3 tracking-tight">
                          {c.type === "PERCENT" ? (
                            <>
                              {c.value}%
                              {c.maxDiscount ? (
                                <span className="text-[11px] text-gray-400">
                                  {" "}
                                  · max {formatPaise(c.maxDiscount)}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            formatPaise(c.value)
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.minOrder ? formatPaise(c.minOrder) : "—"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500">
                          {c.expiresAt
                            ? new Date(c.expiresAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500">
                          {used} / {usageLimit ?? "∞"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill active={!!c.active} expired={!!expired} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          <ActionLink onClick={() => edit(c)} tone="violet">
                            Edit
                          </ActionLink>
                          <ActionLink onClick={() => toggle(c)} tone="amber">
                            {c.active ? "Pause" : "Resume"}
                          </ActionLink>
                          <ActionLink onClick={() => del(c.id)} tone="rose">
                            Delete
                          </ActionLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-2.5">
              {items.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < now;
                const usageLimit = (c as Coupon & { usageLimit?: number }).usageLimit;
                const used = (c as Coupon & { usedCount?: number }).usedCount ?? 0;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-gray-100 p-4 hover:border-accent/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono font-semibold tracking-tight">{c.code}</p>
                        <p className="text-[12px] text-gray-600 mt-0.5">{c.title}</p>
                      </div>
                      <StatusPill active={!!c.active} expired={!!expired} />
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider text-gray-500">
                      <span className="text-accent">
                        {c.type === "PERCENT"
                          ? `${c.value}% off`
                          : formatPaise(c.value)}
                      </span>
                      {c.minOrder ? <span>· min {formatPaise(c.minOrder)}</span> : null}
                      <span>
                        ·{" "}
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString()
                          : "Never"}
                      </span>
                      <span>
                        · {used}/{usageLimit ?? "∞"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <ActionLink onClick={() => edit(c)} tone="violet">
                        Edit
                      </ActionLink>
                      <ActionLink onClick={() => toggle(c)} tone="amber">
                        {c.active ? "Pause" : "Resume"}
                      </ActionLink>
                      <ActionLink onClick={() => del(c.id)} tone="rose">
                        Delete
                      </ActionLink>
                    </div>
                  </div>
                );
              })}
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

function StatusPill({ active, expired }: { active: boolean; expired: boolean }) {
  if (!active) {
    return (
      <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
        Paused
      </span>
    );
  }
  if (expired) {
    return (
      <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
      Active
    </span>
  );
}

function ActionLink({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: "violet" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const cls = {
    violet: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${cls}`}
    >
      {children}
    </button>
  );
}
