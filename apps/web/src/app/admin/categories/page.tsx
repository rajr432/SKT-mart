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

  return (
    <div className="space-y-4">
      <div className="card p-4 md:p-6">
        <h2 className="font-semibold mb-3">
          {editingId ? "Edit category" : "Add new category"}
        </h2>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Name (e.g. Men's Fashion)"
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
          <textarea
            className="input"
            placeholder="Description (optional)"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
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
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Update category" : "Create category"}
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
        <h2 className="font-semibold mb-3">All categories ({flat.length})</h2>
        {flat.length === 0 && (
          <p className="text-sm text-gray-500">No categories yet. Add one above.</p>
        )}
        <div className="space-y-2">
          {topLevel.map((c) => (
            <div key={c.id} className="border rounded">
              <Row cat={c} onEdit={startEdit} onDelete={del} />
              {(c.children ?? []).map((ch) => (
                <div key={ch.id} className="pl-6 border-t bg-gray-50">
                  <Row cat={ch} onEdit={startEdit} onDelete={del} sub />
                </div>
              ))}
            </div>
          ))}
        </div>
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
          className="w-12 h-12 rounded object-cover border"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xl">
          {sub ? "└" : "📂"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{cat.name}</p>
        <p className="text-xs text-gray-500 truncate">
          /{cat.slug}
          {cat._count?.products != null && ` · ${cat._count.products} products`}
          {cat.description && ` · ${cat.description}`}
        </p>
      </div>
      <button onClick={() => onEdit(cat)} className="text-xs text-brand-blue hover:underline">
        Edit
      </button>
      <button onClick={() => onDelete(cat)} className="text-xs text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
