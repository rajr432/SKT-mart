"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function VendorProductsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Product[]>([]);

  const load = async () => {
    const { items } = await api<{ items: Product[] }>("/api/vendor/products", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await api(`/api/vendor/products/${id}`, { token, method: "DELETE" });
    load();
  };

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">My Products ({items.length})</h2>
        <Link href="/vendor/products/new" className="btn-primary">
          + New Product
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.name}</td>
                <td>{p.sku}</td>
                <td>{formatPaise(p.price)}</td>
                <td>{p.stock}</td>
                <td className="text-right space-x-2">
                  <Link href={`/vendor/products/${p.id}`} className="text-brand text-xs">
                    Edit
                  </Link>
                  <button onClick={() => del(p.id)} className="text-red-600 text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">No products yet.</p>
        )}
      </div>
    </div>
  );
}
