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

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  VENDOR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CUSTOMER: "bg-sky-50 text-sky-700 border-sky-200",
};

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
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total" value={stats.total} accent />
        <StatTile label="Customers" value={stats.customers} />
        <StatTile label="Vendors" value={stats.vendors} />
        <StatTile label="Admins" value={stats.admins} />
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Directory</p>
            <h2 className="font-display text-2xl tracking-tightest">Users</h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {items.length} found
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <form
            className="flex flex-1 min-w-[220px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <div className="relative flex-1">
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
                className="w-full rounded-full border border-gray-100 bg-gray-50/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
                placeholder="Search name, email, phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className="btn-primary btn-pill" type="submit">
              Search
            </button>
          </form>
          <select
            className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent/40"
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

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No users found.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 text-left">
                    <Th>Name</Th>
                    <Th>Contact</Th>
                    <Th>Role</Th>
                    <Th>Orders</Th>
                    <Th>Wallet</Th>
                    <Th>Joined</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((u) => (
                    <tr key={u.id} className="hover:bg-violet-50/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium tracking-tight">{u.name}</p>
                        {u.vendor && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {u.vendor.storeName} · {u.vendor.status}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {u.email && (
                          <span className="flex items-center gap-1 text-gray-700">
                            {u.email}
                            {u.emailVerified && (
                              <span className="text-emerald-600">✓</span>
                            )}
                          </span>
                        )}
                        {u.phone && (
                          <span className="flex items-center gap-1 text-gray-500 mt-0.5">
                            {u.phone}
                            {u.phoneVerified && (
                              <span className="text-emerald-600">✓</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 tracking-tight">{u._count.orders}</td>
                      <td className="px-4 py-3 tracking-tight">
                        ₹{(u.walletBalance / 100).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          className="text-[10px] uppercase tracking-wider text-accent hover:underline"
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

            <div className="lg:hidden space-y-2.5">
              {items.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="block rounded-2xl border border-gray-100 p-4 hover:border-accent/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {u.email || u.phone || "—"}
                      </p>
                      {u.vendor && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {u.vendor.storeName} · {u.vendor.status}
                        </p>
                      )}
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider text-gray-500">
                    <span>{u._count.orders} orders</span>
                    <span>·</span>
                    <span>₹{(u.walletBalance / 100).toFixed(0)} wallet</span>
                    <span className="ml-auto">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-premium p-4 ${
        accent ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-0" : ""
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-[0.22em] ${
          accent ? "text-white/80" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p className="font-display text-2xl tracking-tightest mt-1">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
        ROLE_TONE[role] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {role}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
