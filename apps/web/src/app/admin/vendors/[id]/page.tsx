"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface Detail {
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    description: string | null;
    logo: string | null;
    gstin: string | null;
    pan: string | null;
    bankAccount: string | null;
    ifsc: string | null;
    status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
    registrationPaid: boolean;
    registrationPaidAt: string | null;
    walletBalance: number;
    commissionOverride: number | null;
    payoutSchedule: string;
    rating: number;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
      createdAt: string;
    };
    products: Array<{
      id: string;
      name: string;
      slug: string;
      price: number;
      stock: number;
      published: boolean;
      views: number;
      createdAt: string;
    }>;
    _count: { products: number; orderItems: number };
  };
  stats: {
    deliveredItems: number;
    unitsSold: number;
    grossRevenue: number;
    netEarnings: number;
  };
  payouts: Array<{
    id: string;
    amount: number;
    netAmount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }>;
}

export default function AdminVendorDetailPage() {
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token || !id) return;
    const d = await api<Detail>(`/api/admin/vendors/${id}`, { token });
    setData(d);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const changeStatus = async (status: string) => {
    if (!token || !id) return;
    setBusy(true);
    try {
      await api(`/api/admin/vendors/${id}/status`, {
        token,
        method: "PATCH",
        json: { status },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!data)
    return (
      <div className="card p-6 text-center text-gray-500">Loading vendor…</div>
    );

  const { vendor, stats, payouts } = data;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/vendors"
        className="text-sm text-gray-600 hover:text-brand-blue"
      >
        ← All vendors
      </Link>

      {/* Header */}
      <div className="card p-4 md:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold overflow-hidden shrink-0">
            {vendor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.logo}
                alt={vendor.storeName}
                className="w-full h-full object-cover"
              />
            ) : (
              (vendor.storeName?.[0] ?? "S").toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl md:text-2xl font-bold">
              {vendor.storeName}
            </h1>
            <div className="text-sm text-gray-600">
              <Link
                href={`/store/${vendor.slug}`}
                target="_blank"
                className="hover:underline"
              >
                /store/{vendor.slug} ↗
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <StatusBadge status={vendor.status} />
              {vendor.registrationPaid ? (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  ₹199 paid{" "}
                  {vendor.registrationPaidAt
                    ? `on ${new Date(vendor.registrationPaidAt).toLocaleDateString()}`
                    : ""}
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Registration unpaid
                </span>
              )}
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                ⭐ {vendor.rating.toFixed(1)}
              </span>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                Payout: {vendor.payoutSchedule}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Joined {new Date(vendor.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="input !w-auto !py-1 text-xs"
              defaultValue={vendor.status}
              disabled={busy}
              onChange={(e) => changeStatus(e.target.value)}
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <Link
              href={`/admin/users/${vendor.user.id}`}
              className="btn-outline !py-1 text-xs"
            >
              Owner profile →
            </Link>
          </div>
        </div>
        {vendor.description && (
          <p className="text-sm text-gray-600 mt-3">{vendor.description}</p>
        )}
      </div>

      {/* Owner */}
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Owner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={vendor.user.name} />
          <Field
            label="Email"
            value={
              vendor.user.email
                ? `${vendor.user.email}${vendor.user.emailVerified ? " ✓" : ""}`
                : "—"
            }
          />
          <Field
            label="Phone"
            value={
              vendor.user.phone
                ? `${vendor.user.phone}${vendor.user.phoneVerified ? " ✓" : ""}`
                : "—"
            }
          />
          <Field
            label="Customer since"
            value={new Date(vendor.user.createdAt).toLocaleDateString()}
          />
        </div>
      </div>

      {/* KYC / Bank */}
      <div className="card p-4">
        <h2 className="font-semibold mb-2">KYC & payout</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="GSTIN" value={vendor.gstin ?? "Not provided"} />
          <Field label="PAN" value={vendor.pan ?? "Not provided"} />
          <Field
            label="Bank account"
            value={vendor.bankAccount ?? "Not provided"}
          />
          <Field label="IFSC" value={vendor.ifsc ?? "Not provided"} />
          <Field
            label="Commission"
            value={
              vendor.commissionOverride != null
                ? `${vendor.commissionOverride.toFixed(1)}% (override)`
                : "Platform default"
            }
          />
          <Field
            label="Vendor wallet"
            value={`₹${(vendor.walletBalance / 100).toFixed(2)}`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Products"
          value={vendor._count.products.toString()}
        />
        <Stat
          label="Items sold (delivered)"
          value={stats.unitsSold.toString()}
        />
        <Stat
          label="Gross revenue"
          value={`₹${(stats.grossRevenue / 100).toFixed(0)}`}
        />
        <Stat
          label="Net earnings"
          value={`₹${(stats.netEarnings / 100).toFixed(0)}`}
        />
      </div>

      {/* Products */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">
          Products ({vendor.products.length})
        </h2>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Price</th>
                <th className="py-2 px-2">Stock</th>
                <th className="py-2 px-2">Views</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {vendor.products.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 px-2 text-center text-gray-500"
                  >
                    No products yet
                  </td>
                </tr>
              )}
              {vendor.products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="text-brand-blue hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 px-2">
                    ₹{(p.price / 100).toFixed(0)}
                  </td>
                  <td
                    className={`py-2 px-2 ${p.stock <= 5 ? "text-red-600 font-medium" : ""}`}
                  >
                    {p.stock}
                  </td>
                  <td className="py-2 px-2 text-xs">{p.views}</td>
                  <td className="py-2 px-2 text-xs">
                    {p.published ? (
                      <span className="text-green-700">Published</span>
                    ) : (
                      <span className="text-gray-500">Draft</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payouts */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Payouts ({payouts.length})</h2>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="border-b text-left bg-gray-50">
              <tr>
                <th className="py-2 px-2">Gross</th>
                <th className="py-2 px-2">Net</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Created</th>
                <th className="py-2 px-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 px-2 text-center text-gray-500"
                  >
                    No payouts yet
                  </td>
                </tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 px-2">
                    ₹{(p.amount / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2 font-medium">
                    ₹{(p.netAmount / 100).toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {p.status === "PAID" ? (
                      <span className="text-green-700">{p.status}</span>
                    ) : (
                      <span className="text-orange-600">{p.status}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString()
                      : "—"}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
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
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
