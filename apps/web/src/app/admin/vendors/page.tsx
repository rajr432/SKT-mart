"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface V {
  id: string;
  storeName: string;
  slug: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  rating: number;
  registrationPaid: boolean;
  registrationPaidAt: string | null;
  walletBalance: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  _count: { products: number; orderItems: number };
}

export default function AdminVendorsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<V[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const { items } = await api<{ items: V[] }>(
        `/api/admin/vendors${params.toString() ? `?${params}` : ""}`,
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

  const setVendorStatus = async (id: string, s: string) => {
    await api(`/api/admin/vendors/${id}/status`, {
      token,
      method: "PATCH",
      json: { status: s },
    });
    load();
  };

  const stats = useMemo(() => {
    const total = items.length;
    const approved = items.filter((v) => v.status === "APPROVED").length;
    const pending = items.filter((v) => v.status === "PENDING").length;
    const paid = items.filter((v) => v.registrationPaid).length;
    return { total, approved, pending, paid };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total vendors" value={stats.total} color="indigo" />
        <StatTile label="Approved" value={stats.approved} color="green" />
        <StatTile label="Pending" value={stats.pending} color="orange" />
        <StatTile label="Paid reg" value={stats.paid} color="blue" />
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
              placeholder="Search store, slug, owner…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              Search
            </button>
          </form>
          <select
            className="input !w-auto"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setTimeout(load, 0);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Store</th>
                <th className="py-2 px-2">Owner</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Fee</th>
                <th className="py-2 px-2">Products</th>
                <th className="py-2 px-2">Items sold</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-gray-500"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-gray-500"
                  >
                    No vendors found
                  </td>
                </tr>
              )}
              {items.map((v) => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <div className="font-medium">{v.storeName}</div>
                    <div className="text-xs text-gray-500">/{v.slug}</div>
                  </td>
                  <td className="py-2 px-2">
                    <div>{v.user.name}</div>
                    <div className="text-xs text-gray-500">
                      {v.user.email ?? v.user.phone ?? "—"}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="py-2 px-2">
                    {v.registrationPaid ? (
                      <span className="text-xs text-green-700">Paid ✓</span>
                    ) : (
                      <span className="text-xs text-red-600">Unpaid</span>
                    )}
                  </td>
                  <td className="py-2 px-2">{v._count.products}</td>
                  <td className="py-2 px-2">{v._count.orderItems}</td>
                  <td className="py-2 px-2">
                    <select
                      defaultValue={v.status}
                      onChange={(e) => setVendorStatus(v.id, e.target.value)}
                      className="input !w-auto !py-1 text-xs"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <Link
                      className="text-brand-blue hover:underline text-xs font-medium"
                      href={`/admin/vendors/${v.id}`}
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
  color: "indigo" | "blue" | "green" | "orange";
}) {
  const cls = {
    indigo: "from-indigo-500 to-purple-600",
    blue: "from-blue-500 to-cyan-600",
    green: "from-emerald-500 to-green-600",
    orange: "from-orange-500 to-amber-600",
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

function StatusBadge({
  status,
}: {
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
}) {
  const cls = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-orange-100 text-orange-700",
    SUSPENDED: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700",
  }[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
