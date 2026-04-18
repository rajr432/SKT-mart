"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    brand: "",
    sku: "",
    mrp: 0,
    price: 0,
    stock: 0,
    fAssured: false,
    categoryId: "",
    images: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ items: Category[] }>("/api/categories").then((r) => setCategories(r.items));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        images: form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        mrp: Number(form.mrp),
        price: Number(form.price),
        stock: Number(form.stock),
      };
      await api("/api/vendor/products", { token, method: "POST", json: payload });
      router.push("/vendor/products");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4">Add new product</h2>
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-3">
        <input
          className="input md:col-span-2"
          placeholder="Name"
          value={form.name}
          onChange={(e) => {
            const slug = e.target.value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            setForm({ ...form, name: e.target.value, slug });
          }}
          required
        />
        <input
          className="input"
          placeholder="Slug"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          required
        />
        <select
          className="input"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
        >
          <option value="">Select category…</option>
          {categories.flatMap((c) => [
            <option key={c.id} value={c.id}>
              {c.name}
            </option>,
            ...(c.children ?? []).map((ch) => (
              <option key={ch.id} value={ch.id}>
                &nbsp;&nbsp;— {ch.name}
              </option>
            )),
          ])}
        </select>
        <input
          className="input"
          placeholder="Brand"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
        />
        <input
          className="input"
          type="number"
          placeholder="MRP (in paise, e.g. 99900 for ₹999)"
          value={form.mrp}
          onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="Selling price (paise)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.fAssured}
            onChange={(e) => setForm({ ...form, fAssured: e.target.checked })}
          />
          F-Assured quality
        </label>
        <textarea
          className="input md:col-span-2"
          placeholder="Description"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <textarea
          className="input md:col-span-2"
          placeholder="Image URLs (one per line or comma-separated)"
          rows={3}
          value={form.images}
          onChange={(e) => setForm({ ...form, images: e.target.value })}
        />
        {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}
        <button className="btn-yellow md:col-span-2" disabled={loading}>
          {loading ? "…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
