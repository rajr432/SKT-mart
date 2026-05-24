"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface BundleItem {
  id: string;
  productId: string;
  product: { id: string; name: string; slug: string; price: number };
}
interface Bundle {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  discount: number;
  active: boolean;
  items: BundleItem[];
}
interface Product {
  id: string;
  name: string;
  price: number;
}

const inputCls =
  "w-full rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

export default function AdminBundlesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    discount: 10,
    active: true,
    productIds: [] as string[],
  });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [b, p] = await Promise.all([
      api<{ items: Bundle[] }>("/api/admin/bundles", { token }),
      api<{ items: Product[] }>("/api/products?limit=100", { token }),
    ]);
    setItems(b.items);
    setProducts(p.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.productIds.length < 2) return alert("Select at least 2 products");
    try {
      await api("/api/admin/bundles", { token, method: "POST", json: form });
      setForm({
        title: "",
        slug: "",
        description: "",
        discount: 10,
        active: true,
        productIds: [],
      });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete bundle?")) return;
    await api(`/api/admin/bundles/${id}`, { token, method: "DELETE" });
    load();
  };

  const toggleActive = async (b: Bundle) => {
    await api(`/api/admin/bundles/${b.id}`, {
      token,
      method: "PATCH",
      json: { active: !b.active },
    });
    load();
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Catalogue</p>
        <h1 className="font-display text-2xl tracking-tightest">Product bundles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bundle multiple products with a combo discount. Shown as "Frequently bought
          together" on PDP.
        </p>
      </div>

      <form onSubmit={save} className="card-premium p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-lg tracking-tightest">Create bundle</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className={inputCls}
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className={`${inputCls} font-mono`}
            placeholder="slug-like-this"
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              })
            }
            required
          />
          <input
            className={inputCls}
            type="number"
            placeholder="Discount %"
            value={form.discount}
            min={0}
            max={100}
            onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
          />
        </div>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="text-sm flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="accent-accent h-4 w-4"
          />
          <span className="text-gray-700">Active</span>
        </label>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-3 max-h-60 overflow-auto">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
            Select 2–10 products{" "}
            <span className="text-accent">({form.productIds.length} selected)</span>
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {products.map((p) => (
              <label
                key={p.id}
                className={`text-sm flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition ${
                  form.productIds.includes(p.id)
                    ? "bg-violet-50 text-violet-900"
                    : "hover:bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.productIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="accent-accent h-4 w-4"
                />
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-[11px] text-gray-400">
                  {formatPaise(p.price)}
                </span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary btn-pill">Create bundle</button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card-premium py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-6 w-6"
            >
              <path d="M3 7l9-4 9 4-9 4-9-4Z" />
              <path d="M3 12l9 4 9-4" />
              <path d="M3 17l9 4 9-4" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No bundles yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((b) => (
            <div key={b.id} className="card-premium p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-lg tracking-tightest">
                    {b.title}{" "}
                    <span className="text-xs text-gray-400 font-sans tracking-normal">
                      /{b.slug}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] uppercase tracking-wider text-gray-500">
                    <span className="text-accent">{b.discount}% off</span>
                    <span>· {b.items.length} products</span>
                    <span
                      className={`px-2 py-0.5 rounded-full border ${
                        b.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {b.active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${
                      b.active
                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {b.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => del(b.id)}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mt-3 text-sm text-gray-700 space-y-1 border-t border-gray-100 pt-3">
                {b.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between">
                    <span className="truncate">{i.product.name}</span>
                    <span className="text-[11px] text-gray-400 ml-3">
                      {formatPaise(i.product.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
