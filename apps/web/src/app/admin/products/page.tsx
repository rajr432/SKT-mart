"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface P {
  id: string;
  name: string;
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

  const load = async () => {
    const { items } = await api<{ items: P[] }>("/api/admin/products", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const toggle = async (id: string, published: boolean) => {
    await api(`/api/admin/products/${id}`, { token, method: "PATCH", json: { published } });
    load();
  };

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Products</h2>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="py-2">Name</th>
            <th>Seller</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.name}</td>
              <td>{p.vendor.storeName}</td>
              <td>{p.category.name}</td>
              <td>{formatPaise(p.price)}</td>
              <td>{p.stock}</td>
              <td>
                <button
                  onClick={() => toggle(p.id, !p.published)}
                  className={
                    p.published ? "text-brand-green text-xs" : "text-red-600 text-xs"
                  }
                >
                  {p.published ? "Published" : "Unpublished"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
