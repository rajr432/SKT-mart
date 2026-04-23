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
  }, [token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.productIds.length < 2) return alert("Select at least 2 products");
    try {
      await api("/api/admin/bundles", { token, method: "POST", json: form });
      setForm({ title: "", slug: "", description: "", discount: 10, active: true, productIds: [] });
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
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Product Bundles</h1>
        <p className="text-sm text-gray-500">
          Bundle multiple products with a combo discount. Shown as "Frequently bought together" on PDP.
        </p>
      </div>

      <form onSubmit={save} className="card p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="slug-like-this"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
            }
            required
          />
          <input
            className="input"
            type="number"
            placeholder="Discount %"
            value={form.discount}
            min={0}
            max={100}
            onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
          />
        </div>
        <textarea
          className="input w-full"
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>
        <div className="border rounded-md p-2 max-h-56 overflow-auto">
          <p className="text-xs text-gray-500 mb-1">
            Select 2–10 products ({form.productIds.length} selected)
          </p>
          <div className="grid md:grid-cols-3 gap-1">
            {products.map((p) => (
              <label key={p.id} className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.productIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                <span className="truncate">{p.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatPaise(p.price)}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary">Create bundle</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="card p-4 text-gray-500">No bundles yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {b.title}{" "}
                    <span className="text-xs text-gray-500 font-normal">/{b.slug}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {b.discount}% off · {b.items.length} products ·{" "}
                    <span className={b.active ? "text-green-600" : "text-red-600"}>
                      {b.active ? "Active" : "Paused"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(b)} className="btn-outline text-xs">
                    {b.active ? "Pause" : "Activate"}
                  </button>
                  <button onClick={() => del(b.id)} className="text-red-600 text-xs">
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mt-2 text-sm text-gray-700">
                {b.items.map((i) => (
                  <li key={i.id}>
                    · {i.product.name} <span className="text-xs text-gray-400">{formatPaise(i.product.price)}</span>
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
