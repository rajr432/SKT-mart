"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  active: boolean;
  featured: boolean;
}

const blank = { name: "", slug: "", logo: "" };

export default function AdminBrandsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Brand[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const { items } = await api<{ items: Brand[] }>("/api/admin/brands", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const resetForm = () => {
    setForm({ ...blank });
    setEditingId(null);
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const body = {
      name: form.name,
      slug:
        form.slug ||
        form.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      logo: form.logo || undefined,
    };
    try {
      if (editingId) {
        await api(`/api/admin/brands/${editingId}`, {
          token,
          method: "PATCH",
          json: body,
        });
      } else {
        await api("/api/admin/brands", { token, method: "POST", json: body });
      }
      resetForm();
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (b: Brand) => {
    setEditingId(b.id);
    setForm({ name: b.name, slug: b.slug, logo: b.logo ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (b: Brand) => {
    if (!confirm(`Delete brand "${b.name}"? Products under this brand will not be deleted but will show no brand.`))
      return;
    try {
      await api(`/api/admin/brands/${b.id}`, { token, method: "DELETE" });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const toggleFeatured = async (b: Brand) => {
    await api(`/api/admin/brands/${b.id}`, {
      token,
      method: "PATCH",
      json: { featured: !b.featured },
    });
    load();
  };

  const toggleActive = async (b: Brand) => {
    await api(`/api/admin/brands/${b.id}`, {
      token,
      method: "PATCH",
      json: { active: !b.active },
    });
    load();
  };

  const filtered = q
    ? items.filter(
        (b) =>
          b.name.toLowerCase().includes(q.toLowerCase()) ||
          b.slug.toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  return (
    <div className="space-y-4">
      <div className="card p-4 md:p-6">
        <h2 className="font-semibold mb-3">
          {editingId ? "Edit brand" : "Add new brand"}
        </h2>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Name (e.g. Nike)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Slug (auto if blank)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <ImageUploader
            value={form.logo}
            onChange={(logo) => setForm({ ...form, logo })}
            token={token}
            placeholder="Brand logo URL or upload"
            aspect="aspect-square"
          />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Update brand" : "Create brand"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-outline"
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-3 gap-2">
          <h2 className="font-semibold">All brands ({filtered.length})</h2>
          <input
            className="input !w-auto text-sm"
            placeholder="Search brands"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">No brands found.</p>
        )}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((b) => (
            <div key={b.id} className="border rounded p-3 flex items-center gap-3">
              {b.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logo}
                  alt={b.name}
                  className="w-14 h-14 object-contain rounded bg-white border"
                />
              ) : (
                <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-lg font-bold">
                  {b.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.name}</p>
                <p className="text-xs text-gray-500 truncate">/{b.slug}</p>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => toggleFeatured(b)}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      b.featured
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    title="Show on homepage 'Top Brands' strip"
                  >
                    {b.featured ? "⭐ Top" : "Feature"}
                  </button>
                  <button
                    onClick={() => toggleActive(b)}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      b.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {b.active ? "Active" : "Hidden"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => startEdit(b)}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(b)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
