"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface U {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  vendor?: { storeName: string; status: string } | null;
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<U[]>([]);

  useEffect(() => {
    if (!token) return;
    api<{ items: U[] }>("/api/admin/users", { token }).then((r) => setItems(r.items));
  }, [token]);

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">Users ({items.length})</h2>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="py-2">Name</th>
            <th>Contact</th>
            <th>Role</th>
            <th>Vendor</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.name}</td>
              <td>{u.email ?? u.phone}</td>
              <td>{u.role}</td>
              <td>{u.vendor ? `${u.vendor.storeName} (${u.vendor.status})` : "—"}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
