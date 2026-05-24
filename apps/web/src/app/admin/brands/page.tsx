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

const inputCls =
  "w-full rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

export default function AdminBrandsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Brand[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await api<{ items: Brand[] }>("/api/admin/brands", { token });
      setItems(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (
      !confirm(
        `Delete brand "${b.name}"? Products under this brand will not be deleted but will show no brand.`,
      )
    )
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
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Catalogue</p>
        <h2 className="font-display text-2xl tracking-tightest mb-5">
          {editingId ? "Edit brand" : "Add new brand"}
        </h2>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Name (e.g. Nike)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={inputCls}
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
          {err && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-primary btn-pill flex-1" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Update brand" : "Create brand"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-outline btn-pill"
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex justify-between items-end mb-4 gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Library</p>
            <h2 className="font-display text-2xl tracking-tightest">
              All brands
              <span className="ml-2 text-sm text-gray-400 font-sans tracking-normal">
                ({filtered.length})
              </span>
            </h2>
          </div>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className="rounded-full border border-gray-100 bg-gray-50/60 pl-10 pr-4 py-2 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
              placeholder="Search brands"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-shimmer h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <path d="M3 7l3-3h12l3 3v3a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3V7Z" />
                <path d="M5 13v7h14v-7" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No brands found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-gray-100 p-3 flex items-center gap-3 hover:border-accent/40 transition"
              >
                {b.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="w-14 h-14 object-contain rounded-2xl bg-white border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 text-accent grid place-items-center font-display text-lg tracking-tight">
                    {b.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium tracking-tight truncate">{b.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">/{b.slug}</p>
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => toggleFeatured(b)}
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition ${
                        b.featured
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                      }`}
                      title="Show on homepage 'Top Brands' strip"
                    >
                      {b.featured ? "Featured" : "Feature"}
                    </button>
                    <button
                      onClick={() => toggleActive(b)}
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition ${
                        b.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {b.active ? "Active" : "Hidden"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => startEdit(b)}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del(b)}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
