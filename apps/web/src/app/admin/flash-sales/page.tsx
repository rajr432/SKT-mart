"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise as formatPrice } from "@/lib/api";
import type { Product } from "@/lib/types";

type FlashSale = {
  id: string;
  name: string;
  productId: string;
  discountPct: number | null;
  priceOverride: number | null;
  startAt: string;
  endAt: string;
  stock: number | null;
  sold: number;
  active: boolean;
  product: { id: string; name: string; slug: string; price: number };
};

function toLocalInput(iso: string) {
  // <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm"
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminFlashSalesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    name: "",
    productId: "",
    discountPct: 20,
    priceOverride: "" as number | "",
    startAt: toLocalInput(new Date().toISOString()),
    endAt: toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
    stock: "" as number | "",
  });
  const [msg, setMsg] = useState("");

  async function refresh() {
    const r = await api<{ items: FlashSale[] }>("/api/flash-sales/admin", { token });
    setItems(r.items);
  }

  useEffect(() => {
    if (token) refresh();
  }, [token]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q) return setProducts([]);
      const r = await api<{ items: Product[] }>(`/api/products?search=${encodeURIComponent(q)}&limit=10`);
      setProducts(r.items);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function create() {
    setMsg("");
    try {
      await api("/api/flash-sales", {
        token,
        method: "POST",
        json: {
          name: form.name,
          productId: form.productId,
          discountPct: form.priceOverride ? undefined : Number(form.discountPct),
          priceOverride: form.priceOverride ? Number(form.priceOverride) : undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          stock: form.stock ? Number(form.stock) : undefined,
        },
      });
      setMsg("Flash sale created ✓");
      setForm((f) => ({ ...f, name: "", productId: "" }));
      setQ("");
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await api(`/api/flash-sales/${id}`, { token, method: "PATCH", json: { active: !active } });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete flash sale?")) return;
    await api(`/api/flash-sales/${id}`, { token, method: "DELETE" });
    refresh();
  }

  const now = Date.now();
  const live = items.filter((i) => i.active && new Date(i.startAt).getTime() <= now && new Date(i.endAt).getTime() >= now);
  const upcoming = items.filter((i) => new Date(i.startAt).getTime() > now);
  const past = items.filter((i) => new Date(i.endAt).getTime() < now);

  const card = (s: FlashSale) => {
    const isLive = new Date(s.startAt).getTime() <= now && new Date(s.endAt).getTime() >= now;
    return (
      <div key={s.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <p className="font-medium text-sm">{s.name}</p>
          </div>
          <p className="text-xs text-gray-600">{s.product.name}</p>
          <p className="text-xs text-gray-500">
            {new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}
          </p>
        </div>
        <div className="text-sm text-gray-700 min-w-[120px]">
          {s.discountPct != null ? `${s.discountPct}% off` : s.priceOverride != null ? `Price: ${formatPrice(s.priceOverride)}` : "—"}
          {s.stock != null && <div className="text-xs text-gray-500">Sold {s.sold}/{s.stock}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleActive(s.id, s.active)} className="px-2 py-1 text-xs rounded border">
            {s.active ? "Pause" : "Resume"}
          </button>
          <button onClick={() => remove(s.id)} className="px-2 py-1 text-xs rounded border text-red-600">Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Flash Sales</h1>
        <p className="text-sm text-gray-500">Time-bound discounts on selected products.</p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Create flash sale</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium">Name</span>
            <input className="input w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Search product</span>
            <input className="input w-full mt-1" placeholder="Type to search" value={q} onChange={(e) => setQ(e.target.value)} />
            {products.length > 0 && (
              <div className="mt-1 border rounded bg-white max-h-40 overflow-y-auto">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setForm({ ...form, productId: p.id }); setQ(p.name); setProducts([]); }}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50"
                  >
                    {p.name} — {formatPrice(p.price)}
                  </button>
                ))}
              </div>
            )}
            {form.productId && <p className="text-[11px] text-green-600 mt-1">Selected: {form.productId}</p>}
          </label>
          <label className="block">
            <span className="text-xs font-medium">Discount %</span>
            <input type="number" className="input w-full mt-1" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Or price override (paise)</span>
            <input type="number" className="input w-full mt-1" value={form.priceOverride} onChange={(e) => setForm({ ...form, priceOverride: e.target.value === "" ? "" : Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Start</span>
            <input type="datetime-local" className="input w-full mt-1" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">End</span>
            <input type="datetime-local" className="input w-full mt-1" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Stock cap (optional)</span>
            <input type="number" className="input w-full mt-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value === "" ? "" : Number(e.target.value) })} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={create} disabled={!form.name || !form.productId} className="btn-primary">Create sale</button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Live <span className="text-xs font-normal text-gray-500">({live.length})</span></h2>
        {live.map(card)}
        {live.length === 0 && <p className="text-sm text-gray-500">No live flash sales right now.</p>}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Upcoming <span className="text-xs font-normal text-gray-500">({upcoming.length})</span></h2>
        {upcoming.map(card)}
        {upcoming.length === 0 && <p className="text-sm text-gray-500">No scheduled sales.</p>}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Past <span className="text-xs font-normal text-gray-500">({past.length})</span></h2>
        {past.slice(0, 20).map(card)}
      </section>
    </div>
  );
}
