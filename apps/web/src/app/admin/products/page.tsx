"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface P {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  published: boolean;
  vendor: { storeName: string };
  category: { name: string };
}

export default function AdminProductsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unpublished" | "low">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { items } = await api<{ items: P[] }>("/api/admin/products", { token });
    setItems(items);
    setLoading(false);
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((p) => {
      if (
        needle &&
        !`${p.name} ${p.sku} ${p.vendor.storeName} ${p.category.name}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (statusFilter === "published" && !p.published) return false;
      if (statusFilter === "unpublished" && p.published) return false;
      if (statusFilter === "low" && p.stock > 5) return false;
      return true;
    });
  }, [items, q, statusFilter]);

  const toggle = async (id: string, published: boolean) => {
    await api(`/api/admin/products/${id}`, { token, method: "PATCH", json: { published } });
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, published } : p)));
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await api(`/api/admin/products/${id}`, { token, method: "DELETE" });
    setItems((prev) => prev.filter((p) => p.id !== id));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const bulkPublish = async (published: boolean) => {
    if (selected.size === 0) return;
    setBusy(true);
    await api("/api/admin/products/bulk/publish", {
      token,
      method: "PATCH",
      json: { ids: Array.from(selected), published },
    });
    setItems((prev) =>
      prev.map((p) => (selected.has(p.id) ? { ...p, published } : p)),
    );
    setSelected(new Set());
    setBusy(false);
  };

  const exportCSV = () => {
    const escape = (v: string) => {
      const s = String(v ?? "");
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["Name", "SKU", "Seller", "Category", "Price", "Stock", "Published"].join(","),
      ...filtered.map((p) =>
        [
          escape(p.name),
          escape(p.sku),
          escape(p.vendor.storeName),
          escape(p.category.name),
          (p.price / 100).toFixed(2),
          p.stock,
          p.published ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Products ({filtered.length}/{items.length})
        </h2>
        <button onClick={exportCSV} className="text-xs btn-primary !px-3 !py-1.5">
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, SKU, seller, category…"
          className="input flex-1 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="input"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="low">Low stock (≤5)</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="bg-brand/5 border border-brand/30 rounded p-2 flex items-center gap-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button
            disabled={busy}
            onClick={() => bulkPublish(true)}
            className="text-xs bg-brand-green text-white px-2 py-1 rounded"
          >
            Publish
          </button>
          <button
            disabled={busy}
            onClick={() => bulkPublish(false)}
            className="text-xs bg-orange-500 text-white px-2 py-1 rounded"
          >
            Unpublish
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-600 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-600">No products match.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2 w-8">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="py-2 px-2">Name</th>
                <th className="px-2">Seller</th>
                <th className="px-2">Category</th>
                <th className="px-2">Price</th>
                <th className="px-2">Stock</th>
                <th className="px-2">Status</th>
                <th className="px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => {
                        const n = new Set(selected);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        setSelected(n);
                      }}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="hover:text-brand"
                    >
                      {p.name}
                    </Link>
                    <p className="text-[11px] text-gray-500">{p.sku}</p>
                  </td>
                  <td className="px-2">{p.vendor.storeName}</td>
                  <td className="px-2">{p.category.name}</td>
                  <td className="px-2">{formatPaise(p.price)}</td>
                  <td className={`px-2 ${p.stock <= 5 ? "text-red-600 font-semibold" : ""}`}>
                    {p.stock}
                  </td>
                  <td className="px-2">
                    <button
                      onClick={() => toggle(p.id, !p.published)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.published
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.published ? "Published" : "Unpublished"}
                    </button>
                  </td>
                  <td className="px-2 text-right">
                    <button
                      onClick={() => remove(p.id, p.name)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
