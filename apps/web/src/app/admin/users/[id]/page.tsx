"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

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
      <div className="card p-6 text-center text-gray-500">Loading user…</div>
    );

  const { user, walletTxns, totalSpent } = data;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/users"
        className="text-sm text-gray-600 hover:text-brand-blue"
      >
        ← All users
      </Link>

      {/* Profile card */}
      <div className="card p-4 md:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl md:text-2xl font-bold">{user.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mt-1">
              {user.email && (
                <span>
                  ✉ {user.email}
                  {user.emailVerified && (
                    <span className="text-green-600 ml-1">✓</span>
                  )}
                </span>
              )}
              {user.phone && (
                <span>
                  📞 {user.phone}
                  {user.phoneVerified && (
                    <span className="text-green-600 ml-1">✓</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <Badge color="blue">{user.role}</Badge>
              {user.vendor && (
                <Badge color="green">
                  🏪 {user.vendor.storeName} · {user.vendor.status}
                </Badge>
              )}
              {user.referralCode && (
                <Badge color="purple">Ref: {user.referralCode}</Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Joined {new Date(user.createdAt).toLocaleString()} · Last updated{" "}
              {new Date(user.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="input !w-auto !py-1"
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
                className="btn-outline !py-1 text-xs"
              >
                Vendor profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total orders" value={user._count.orders.toString()} />
        <Stat
          label="Total spent"
          value={`₹${(totalSpent / 100).toFixed(0)}`}
        />
        <Stat
          label="Wallet"
          value={`₹${(user.walletBalance / 100).toFixed(0)}`}
        />
        <Stat
          label="Loyalty coins"
          value={user.loyaltyPoints.toString()}
        />
      </div>

      {/* Addresses */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">
          Addresses ({user.addresses.length})
        </h2>
        {user.addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses saved.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {user.addresses.map((a) => (
              <div
                key={a.id}
                className="border rounded-lg p-3 text-sm bg-gray-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{a.name}</span>
                  {a.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-gray-700">📞 {a.phone}</div>
                <div className="text-gray-700 text-xs mt-1">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} -{" "}
                  {a.pincode}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">
          Recent orders ({user.orders.length})
        </h2>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Order #</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Payment</th>
                <th className="py-2 px-2">Total</th>
                <th className="py-2 px-2">Placed</th>
              </tr>
            </thead>
            <tbody>
              {user.orders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 px-2 text-center text-gray-500"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
              {user.orders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-2 px-2 font-mono text-xs">
                    {o.orderNumber}
                  </td>
                  <td className="py-2 px-2 text-xs">{o.status}</td>
                  <td className="py-2 px-2 text-xs">
                    {o.paymentStatus} · {o.paymentMethod}
                  </td>
                  <td className="py-2 px-2">
                    ₹{(o.total / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(o.placedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet transactions */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">
          Wallet transactions ({walletTxns.length})
        </h2>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Reason</th>
                <th className="py-2 px-2">Amount</th>
                <th className="py-2 px-2">Balance</th>
                <th className="py-2 px-2">Note</th>
                <th className="py-2 px-2">When</th>
              </tr>
            </thead>
            <tbody>
              {walletTxns.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 px-2 text-center text-gray-500"
                  >
                    No wallet activity
                  </td>
                </tr>
              )}
              {walletTxns.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 px-2 text-xs">{t.reason}</td>
                  <td
                    className={`py-2 px-2 font-medium ${t.amount >= 0 ? "text-green-700" : "text-red-600"}`}
                  >
                    {t.amount >= 0 ? "+" : ""}₹{(t.amount / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2">
                    ₹{(t.balanceAfter / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-600">
                    {t.note ?? "—"}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">
          Recent notifications ({user.notifications.length})
        </h2>
        {user.notifications.length === 0 ? (
          <p className="text-sm text-gray-500">No notifications.</p>
        ) : (
          <ul className="space-y-2">
            {user.notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-2 text-sm border-b pb-2 last:border-0"
              >
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-gray-500">
                    {n.type} · {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                {!n.read && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded h-fit">
                    New
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg md:text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "blue" | "green" | "purple";
}) {
  const cls = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
  }[color];
  return (
    <span className={`inline-block px-2 py-0.5 rounded ${cls}`}>{children}</span>
  );
}
