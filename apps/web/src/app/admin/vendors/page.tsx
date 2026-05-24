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

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUSPENDED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

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
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total" value={stats.total} accent />
        <StatTile label="Approved" value={stats.approved} />
        <StatTile label="Pending" value={stats.pending} />
        <StatTile label="Paid reg" value={stats.paid} />
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Marketplace</p>
            <h2 className="font-display text-2xl tracking-tightest">Vendors</h2>
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
                placeholder="Search store, slug, owner…"
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
                <path d="M3 9h18l-1.5 9H4.5L3 9Z" />
                <path d="M8 9V6a4 4 0 1 1 8 0v3" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No vendors found.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 text-left">
                    <Th>Store</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                    <Th>Fee</Th>
                    <Th>Products</Th>
                    <Th>Sold</Th>
                    <Th>Action</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((v) => (
                    <tr key={v.id} className="hover:bg-violet-50/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium tracking-tight">{v.storeName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">/{v.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="tracking-tight">{v.user.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {v.user.email ?? v.user.phone ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            STATUS_TONE[v.status] ||
                            "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.registrationPaid ? (
                          <span className="text-[10px] uppercase tracking-wider text-emerald-600">
                            Paid
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-rose-600">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tracking-tight">{v._count.products}</td>
                      <td className="px-4 py-3 tracking-tight">{v._count.orderItems}</td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={v.status}
                          onChange={(e) => setVendorStatus(v.id, e.target.value)}
                          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] outline-none focus:border-accent/40"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          className="text-[10px] uppercase tracking-wider text-accent hover:underline"
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

            <div className="lg:hidden space-y-2.5">
              {items.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-gray-100 p-4 hover:border-accent/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/vendors/${v.id}`}
                        className="font-medium tracking-tight hover:text-accent block truncate"
                      >
                        {v.storeName}
                      </Link>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        /{v.slug} · {v.user.name}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        STATUS_TONE[v.status] ||
                        "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider text-gray-500">
                    <span>{v._count.products} products</span>
                    <span>·</span>
                    <span>{v._count.orderItems} sold</span>
                    {v.registrationPaid ? (
                      <span className="ml-auto text-emerald-600">Paid</span>
                    ) : (
                      <span className="ml-auto text-rose-600">Unpaid</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <select
                      defaultValue={v.status}
                      onChange={(e) => setVendorStatus(v.id, e.target.value)}
                      className="w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:border-accent/40"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
