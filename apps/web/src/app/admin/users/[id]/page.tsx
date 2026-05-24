"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Detail {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    avatar: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    walletBalance: number;
    loyaltyPoints: number;
    referralCode: string | null;
    createdAt: string;
    updatedAt: string;
    addresses: Array<{
      id: string;
      name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      pincode: string;
      isDefault: boolean;
    }>;
    vendor: {
      id: string;
      storeName: string;
      slug: string;
      status: string;
      registrationPaid: boolean;
    } | null;
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      total: number;
      paymentStatus: string;
      paymentMethod: string;
      placedAt: string;
    }>;
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      createdAt: string;
      read: boolean;
    }>;
    _count: { orders: number; reviews: number; returns: number };
  };
  walletTxns: Array<{
    id: string;
    amount: number;
    reason: string;
    note: string | null;
    createdAt: string;
    balanceAfter: number;
  }>;
  totalSpent: number;
}

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  VENDOR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CUSTOMER: "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_TONE: Record<string, string> = {
  PLACED: "bg-sky-50 text-sky-700 border-sky-200",
  CONFIRMED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PACKED: "bg-violet-50 text-violet-700 border-violet-200",
  SHIPPED: "bg-amber-50 text-amber-700 border-amber-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  RETURNED: "bg-gray-50 text-gray-600 border-gray-200",
};

const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminUserDetailPage() {
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token || !id) return;
    const d = await api<Detail>(`/api/admin/users/${id}`, { token });
    setData(d);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const changeRole = async (role: string) => {
    if (!token || !id) return;
    if (!confirm(`Change role to ${role}?`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${id}/role`, {
        token,
        method: "PATCH",
        json: { role },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!data)
    return (
      <div className="space-y-5">
        <div className="card-premium p-5 sm:p-6 space-y-3">
          <div className="skeleton-shimmer h-5 w-32 rounded-full" />
          <div className="skeleton-shimmer h-6 w-48 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );

  const { user, walletTxns, totalSpent } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-accent transition inline-block"
      >
        ← All users
      </Link>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white text-2xl md:text-3xl font-display tracking-tightest shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display text-2xl md:text-3xl tracking-tightest">
              {user.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1.5">
              {user.email && (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-[14px] w-[14px] text-gray-400"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                  {user.email}
                  {user.emailVerified && (
                    <span className="text-emerald-600">✓</span>
                  )}
                </span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-[14px] w-[14px] text-gray-400"
                  >
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
                  </svg>
                  {user.phone}
                  {user.phoneVerified && (
                    <span className="text-emerald-600">✓</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  ROLE_TONE[user.role] ??
                  "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {user.role}
              </span>
              {user.vendor && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {user.vendor.storeName} · {user.vendor.status}
                </span>
              )}
              {user.referralCode && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 font-mono">
                  Ref: {user.referralCode}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-2.5">
              Joined {new Date(user.createdAt).toLocaleDateString()} · Updated{" "}
              {new Date(user.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="rounded-full border border-gray-100 bg-gray-50/60 px-3.5 py-1.5 text-xs outline-none focus:border-accent/40 focus:bg-white transition disabled:opacity-50"
              defaultValue={user.role}
              disabled={busy}
              onChange={(e) => changeRole(e.target.value)}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="ADMIN">Admin</option>
            </select>
            {user.vendor && (
              <Link
                href={`/admin/vendors/${user.vendor.id}`}
                className="text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition"
              >
                Vendor profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total orders" value={user._count.orders.toString()} />
        <Stat label="Total spent" value={formatPaise(totalSpent)} accent />
        <Stat label="Wallet" value={formatPaise(user.walletBalance)} />
        <Stat label="Loyalty coins" value={user.loyaltyPoints.toString()} />
      </div>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Addresses · {user.addresses.length}
        </p>
        {user.addresses.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No addresses saved.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {user.addresses.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-gray-100 p-4 hover:border-accent/30 hover:bg-violet-50/30 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium tracking-tight">{a.name}</span>
                  {a.isDefault && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-600">{a.phone}</p>
                <p className="text-[12px] text-gray-600 mt-1">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} —{" "}
                  {a.pincode}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Recent orders · {user.orders.length}
        </p>
        {user.orders.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No orders yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th>Total</Th>
                  <Th>Placed</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {user.orders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-violet-50/30 transition"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px]">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          STATUS_TONE[o.status] ??
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          PAYMENT_TONE[o.paymentStatus] ??
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1.5">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">
                      {formatPaise(o.total)}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {new Date(o.placedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Wallet activity · {walletTxns.length}
        </p>
        {walletTxns.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No wallet activity.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Reason</Th>
                  <Th>Amount</Th>
                  <Th>Balance</Th>
                  <Th>Note</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {walletTxns.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-violet-50/30 transition"
                  >
                    <td className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-gray-500">
                      {t.reason}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-medium tabular-nums ${
                        t.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {formatPaise(t.amount)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatPaise(t.balanceAfter)}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-600">
                      {t.note ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Recent notifications · {user.notifications.length}
        </p>
        {user.notifications.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No notifications.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {user.notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium tracking-tight text-[13px] truncate">
                    {n.title}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {n.type} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    New
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
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

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-premium p-4 ${
        accent
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-0"
          : ""
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-[0.22em] ${
          accent ? "text-white/80" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p className="font-display text-xl md:text-2xl tracking-tightest mt-1 break-words">
        {value}
      </p>
    </div>
  );
}
