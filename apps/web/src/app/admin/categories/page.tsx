"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Cat[];
  _count?: { products: number };
}

const blank = { name: "", slug: "", description: "", image: "", parentId: "" };

export default function AdminCategoriesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Cat[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const { items } = await api<{ items: Cat[] }>("/api/categories");
    setItems(items);
  };

  useEffect(() => {
    load();
  }, []);

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
      description: form.description || undefined,
      image: form.image || undefined,
      parentId: form.parentId || undefined,
    };
    try {
      if (editingId) {
        await api(`/api/admin/categories/${editingId}`, {
          token,
          method: "PATCH",
          json: body,
        });
      } else {
        await api("/api/admin/categories", { token, method: "POST", json: body });
      }
      resetForm();
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: Cat) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image: c.image ?? "",
      parentId: c.parentId ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (c: Cat) => {
    const hasChildren = (c.children?.length ?? 0) > 0;
    const msg = hasChildren
      ? `"${c.name}" ke ${c.children?.length} subcategories bhi hain — pehle unko migrate/delete karna hoga.`
      : `Delete "${c.name}"? (all its products will become uncategorized)`;
    if (!confirm(msg)) return;
    try {
      await api(`/api/admin/categories/${c.id}`, { token, method: "DELETE" });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const flat: Cat[] = items.flatMap((c) => [c, ...(c.children ?? [])]);
  const topLevel = items;
  const inputCls =
    "rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm outline-none focus:border-accent/40 focus:bg-white transition";

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Catalog</p>
        <h2 className="font-display text-2xl tracking-tightest mb-5">
          {editingId ? "Edit category" : "Add new category"}
        </h2>
        <form onSubmit={submit} className="grid gap-3.5">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Name (e.g. Men's Fashion)"
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
          <textarea
            className={inputCls}
            placeholder="Description (optional)"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className={inputCls}
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          >
            <option value="">— Top-level category —</option>
            {topLevel
              .filter((c) => c.id !== editingId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Under: {c.name}
                </option>
              ))}
          </select>
          <ImageUploader
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
            token={token}
            placeholder="Category image URL or upload"
            aspect="aspect-square"
          />
          {err && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-primary btn-pill flex-1" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Update category" : "Create category"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-sm uppercase tracking-wider text-gray-700 hover:border-accent/40 hover:text-accent transition"
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Tree</p>
            <h2 className="font-display text-2xl tracking-tightest">All categories</h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {flat.length} total
          </span>
        </div>
        {flat.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <path d="M4 6h6M4 12h10M4 18h7" />
                <circle cx="14" cy="6" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No categories yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topLevel.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-gray-100 overflow-hidden"
              >
                <Row cat={c} onEdit={startEdit} onDelete={del} />
                {(c.children ?? []).map((ch) => (
                  <div
                    key={ch.id}
                    className="pl-6 border-t border-gray-100 bg-gray-50/40"
                  >
                    <Row cat={ch} onEdit={startEdit} onDelete={del} sub />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  cat,
  onEdit,
  onDelete,
  sub = false,
}: {
  cat: Cat;
  onEdit: (c: Cat) => void;
  onDelete: (c: Cat) => void;
  sub?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      {cat.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cat.image}
          alt={cat.name}
          className="w-14 h-14 rounded-2xl object-cover border border-gray-100"
        />
      ) : (
        <div
          className={`w-14 h-14 rounded-2xl border border-gray-100 grid place-items-center ${
            sub
              ? "bg-gray-50 text-gray-400"
              : "bg-gradient-to-br from-violet-50 to-fuchsia-50 text-accent"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
          >
            {sub ? (
              <path d="M5 5v8a4 4 0 0 0 4 4h11" />
            ) : (
              <>
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
              </>
            )}
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium tracking-tight truncate">{cat.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
          /{cat.slug}
          {cat._count?.products != null && ` · ${cat._count.products} products`}
          {cat.description && ` · ${cat.description}`}
        </p>
      </div>
      <button
        onClick={() => onEdit(cat)}
        className="text-[10px] uppercase tracking-wider text-accent hover:underline"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(cat)}
        className="text-[10px] uppercase tracking-wider text-rose-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}
