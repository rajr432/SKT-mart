"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface U {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  walletBalance: number;
  loyaltyPoints: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  vendor?: { storeName: string; status: string } | null;
  _count: { orders: number; addresses: number; reviews: number };
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      const { items } = await api<{ items: U[] }>(
        `/api/admin/users${params.toString() ? `?${params}` : ""}`,
        { token },
      );
      setItems(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const total = items.length;
    const customers = items.filter((u) => u.role === "CUSTOMER").length;
    const vendors = items.filter((u) => u.role === "VENDOR").length;
    const admins = items.filter((u) => u.role === "ADMIN").length;
    return { total, customers, vendors, admins };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total users" value={stats.total} color="indigo" />
        <StatTile label="Customers" value={stats.customers} color="blue" />
        <StatTile label="Vendors" value={stats.vendors} color="green" />
        <StatTile label="Admins" value={stats.admins} color="red" />
      </div>

      <div className="card p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <form
            className="flex flex-1 min-w-[200px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              className="input flex-1"
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              Search
            </button>
          </form>
          <select
            className="input !w-auto"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setTimeout(load, 0);
            }}
          >
            <option value="">All roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="VENDOR">Vendors</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Contact</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Orders</th>
                <th className="py-2 px-2">Wallet</th>
                <th className="py-2 px-2">Joined</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <div className="font-medium">{u.name}</div>
                    {u.vendor && (
                      <div className="text-xs text-gray-500">
                        🏪 {u.vendor.storeName} · {u.vendor.status}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex flex-col text-xs">
                      {u.email && (
                        <span className="flex items-center gap-1">
                          {u.email}
                          {u.emailVerified && <span className="text-green-600">✓</span>}
                        </span>
                      )}
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          {u.phone}
                          {u.phoneVerified && <span className="text-green-600">✓</span>}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="py-2 px-2">{u._count.orders}</td>
                  <td className="py-2 px-2">
                    ₹{(u.walletBalance / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-2">
                    <Link
                      className="text-brand-blue hover:underline text-xs font-medium"
                      href={`/admin/users/${u.id}`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "indigo" | "blue" | "green" | "red";
}) {
  const cls = {
    indigo: "from-indigo-500 to-purple-600",
    blue: "from-blue-500 to-cyan-600",
    green: "from-emerald-500 to-green-600",
    red: "from-rose-500 to-red-600",
  }[color];
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${cls} text-white p-4 shadow`}
    >
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "ADMIN"
      ? "bg-red-100 text-red-700"
      : role === "VENDOR"
        ? "bg-green-100 text-green-700"
        : "bg-blue-100 text-blue-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}
