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
    setItems((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, published } : p)));
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
    <div className="card-premium p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Catalog</p>
          <h2 className="font-display text-2xl tracking-tightest">Products</h2>
          <p className="text-xs text-gray-500 mt-1">
            {filtered.length} of {items.length} shown
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs uppercase tracking-wider text-gray-700 hover:border-accent/40 hover:text-accent transition"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
          >
            <path d="M12 4v12" />
            <path d="m6 10 6 6 6-6" />
            <path d="M4 20h16" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, seller, category…"
            className="w-full rounded-full border border-gray-100 bg-gray-50/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent/40"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="low">Low stock (≤5)</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-accent">{selected.size} selected</span>
          <button
            disabled={busy}
            onClick={() => bulkPublish(true)}
            className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-full hover:bg-emerald-600 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            disabled={busy}
            onClick={() => bulkPublish(false)}
            className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-full hover:bg-amber-600 disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-600 ml-auto hover:text-gray-900"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-12 w-full rounded-2xl" />
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
              <path d="M6 7h12l-1 13H7L6 7Z" />
              <path d="M9 7V5a3 3 0 1 1 6 0v2" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No products match.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <th className="px-4 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="accent-accent"
                    />
                  </th>
                  <Th>Name</Th>
                  <Th>Seller</Th>
                  <Th>Category</Th>
                  <Th>Price</Th>
                  <Th>Stock</Th>
                  <Th>Status</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => {
                          const n = new Set(selected);
                          if (n.has(p.id)) n.delete(p.id);
                          else n.add(p.id);
                          setSelected(n);
                        }}
                        className="accent-accent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/product/${p.slug}`}
                        target="_blank"
                        className="hover:text-accent tracking-tight font-medium"
                      >
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.vendor.storeName}</td>
                    <td className="px-4 py-3 text-gray-700">{p.category.name}</td>
                    <td className="px-4 py-3 font-medium tracking-tight">
                      {formatPaise(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-medium ${
                          p.stock <= 5 ? "text-rose-600" : "text-gray-700"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(p.id, !p.published)}
                        className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${
                          p.published
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        {p.published ? "Published" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="text-[11px] uppercase tracking-wider text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2.5">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => {
                      const n = new Set(selected);
                      if (n.has(p.id)) n.delete(p.id);
                      else n.add(p.id);
                      setSelected(n);
                    }}
                    className="mt-1 accent-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="font-medium tracking-tight hover:text-accent block truncate"
                    >
                      {p.name}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {p.sku} · {p.vendor.storeName} · {p.category.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-display text-base tracking-tight">
                        {formatPaise(p.price)}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider ${
                          p.stock <= 5 ? "text-rose-600" : "text-gray-500"
                        }`}
                      >
                        Stock {p.stock}
                      </span>
                      <button
                        onClick={() => toggle(p.id, !p.published)}
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          p.published
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {p.published ? "Published" : "Hidden"}
                      </button>
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="ml-auto text-[10px] uppercase tracking-wider text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
