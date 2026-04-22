"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
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
  });
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ items: Category[] }>("/api/categories").then((r) => setCategories(r.items));
  }, []);

  const addUrl = () => {
    const url = urlInput.trim();
    if (url && !images.includes(url)) {
      setImages([...images, url]);
      setUrlInput("");
    }
  };

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const r = await api<{ urls: string[] }>("/api/uploads", {
        token: token ?? undefined,
        method: "POST",
        body: fd,
      });
      setImages((prev) => [...prev, ...r.urls]);
    } catch (e) {
      setErr((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        images,
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

        {/* ===== Product Images: URL + Gallery Upload ===== */}
        <div className="md:col-span-2 space-y-3">
          <label className="font-medium text-sm">
            Product images ({images.length})
          </label>

          {/* URL input */}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Paste image URL and click Add"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
            <button
              type="button"
              onClick={addUrl}
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-gray-50"
            >
              + Add URL
            </button>
          </div>

          {/* Gallery upload */}
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "📷 Upload from gallery"}
            </button>
            <span className="text-xs text-gray-500">
              Select multiple images at once (max 8)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={uploadFiles}
            />
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Product ${i + 1}`}
                    className="w-20 h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}
        <button className="btn-yellow md:col-span-2" disabled={loading}>
          {loading ? "…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
