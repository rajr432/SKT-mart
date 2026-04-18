"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface V {
  id: string;
  storeName: string;
  slug: string;
  status: string;
  rating: number;
  user: { name: string; email: string | null; phone: string | null };
}

export default function AdminVendorsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<V[]>([]);

  const load = async () => {
    const { items } = await api<{ items: V[] }>("/api/admin/vendors", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const setStatus = async (id: string, status: string) => {
    await api(`/api/admin/vendors/${id}/status`, { token, method: "PATCH", json: { status } });
    load();
  };

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Vendors</h2>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="py-2">Store</th>
            <th>Owner</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="py-2">
                {v.storeName}
                <div className="text-xs text-gray-500">/{v.slug}</div>
              </td>
              <td>
                {v.user.name}
                <div className="text-xs text-gray-500">{v.user.email ?? v.user.phone}</div>
              </td>
              <td>
                <span
                  className={
                    v.status === "APPROVED"
                      ? "text-brand-green"
                      : v.status === "PENDING"
                        ? "text-orange-600"
                        : "text-red-600"
                  }
                >
                  {v.status}
                </span>
              </td>
              <td className="space-x-2">
                <select
                  defaultValue={v.status}
                  onChange={(e) => setStatus(v.id, e.target.value)}
                  className="input !w-auto !py-1"
                >
                  <option>PENDING</option>
                  <option>APPROVED</option>
                  <option>SUSPENDED</option>
                  <option>REJECTED</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
