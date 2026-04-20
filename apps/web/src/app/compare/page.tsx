"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatPaise, discountPercent } from "@/lib/api";
import { removeFromCompare, type CompareItem } from "@/components/CompareDrawer";
import type { Product } from "@/lib/types";

export default function ComparePage() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored: CompareItem[] = JSON.parse(localStorage.getItem("skt:compare") ?? "[]");
    setItems(stored);
    if (stored.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      stored.map((it) =>
        api<{ product: Product }>(`/api/products/${it.slug}`)
          .then((r) => r.product)
          .catch(() => null),
      ),
    ).then((res) => {
      setProducts(res.filter(Boolean) as Product[]);
      setLoading(false);
    });

    const onChange = () => {
      const s: CompareItem[] = JSON.parse(localStorage.getItem("skt:compare") ?? "[]");
      setItems(s);
      setProducts((prev) => prev.filter((p) => s.some((i) => i.id === p.id)));
    };
    window.addEventListener("skt:compare:change", onChange);
    return () => window.removeEventListener("skt:compare:change", onChange);
  }, []);

  if (loading) {
    return <div className="container-page py-10 text-center text-gray-500">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-10 text-center">
        <div className="card p-10">
          <h1 className="text-2xl font-semibold mb-2">No products to compare</h1>
          <p className="text-gray-600 mb-4">
            Add up to 4 products from any product card to compare them side by side.
          </p>
          <Link href="/" className="btn-primary inline-block">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  // Build comparison rows from intersection of specs.
  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs ?? {}))),
  );

  const rows: Array<{ label: string; values: (string | number | null)[] }> = [
    { label: "Brand", values: products.map((p) => p.brand ?? "-") },
    { label: "Price", values: products.map((p) => formatPaise(p.price)) },
    { label: "MRP", values: products.map((p) => formatPaise(p.mrp)) },
    {
      label: "Discount",
      values: products.map((p) => `${discountPercent(p.mrp, p.price)}% off`),
    },
    { label: "Rating", values: products.map((p) => `${p.rating.toFixed(1)} ★ (${p.ratingCount})`) },
    { label: "In stock", values: products.map((p) => (p.stock > 0 ? `Yes (${p.stock})` : "No")) },
    {
      label: "F-Assured",
      values: products.map((p) => (p.fAssured ? "✓" : "—")),
    },
    {
      label: "Seller",
      values: products.map((p) => p.vendor?.storeName ?? "SKT Mart"),
    },
    ...allSpecKeys.map((k) => ({
      label: k,
      values: products.map((p) => (p.specs && p.specs[k] != null ? String(p.specs[k]) : "—")),
    })),
  ];

  return (
    <div className="container-page py-6 space-y-4">
      <div className="card p-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Compare Products</h1>
          <p className="text-sm text-gray-600">{products.length} products selected</p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("skt:compare", "[]");
            window.dispatchEvent(new CustomEvent("skt:compare:change"));
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left text-xs uppercase text-gray-500 font-semibold w-32">
                Property
              </th>
              {products.map((p) => (
                <th key={p.id} className="p-3 text-center min-w-[180px]">
                  <Link href={`/product/${p.slug}`} className="block">
                    <div className="aspect-square bg-gray-50 rounded mb-2 grid place-items-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.images[0]?.url ?? "/placeholder.png"}
                        alt={p.name}
                        className="object-contain w-full h-full p-2"
                      />
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                  </Link>
                  <button
                    onClick={() => removeFromCompare(p.id)}
                    className="text-xs text-red-600 hover:underline mt-1"
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0 even:bg-gray-50/50">
                <td className="p-3 font-semibold text-xs text-gray-600 uppercase">
                  {r.label}
                </td>
                {r.values.map((v, j) => (
                  <td key={j} className="p-3 text-center">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-3" />
              {products.map((p) => (
                <td key={p.id} className="p-3 text-center">
                  <Link href={`/product/${p.slug}`} className="btn-primary !px-3 !py-1.5 text-xs">
                    View →
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
