"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

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

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUSPENDED: "bg-orange-50 text-orange-700 border-orange-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const PAYOUT_TONE: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-sky-50 text-sky-700 border-sky-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

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

  const { vendor, stats, payouts } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/vendors"
        className="text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-accent transition inline-block"
      >
        ← All vendors
      </Link>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-500 grid place-items-center text-white text-2xl md:text-3xl font-display tracking-tightest overflow-hidden shrink-0">
            {vendor.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
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
            <h1 className="font-display text-2xl md:text-3xl tracking-tightest">
              {vendor.storeName}
            </h1>
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="text-[12px] text-gray-500 hover:text-accent link-accent"
            >
              /store/{vendor.slug} ↗
            </Link>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  STATUS_TONE[vendor.status] ??
                  "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {vendor.status}
              </span>
              {vendor.registrationPaid ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  ₹199 paid
                  {vendor.registrationPaidAt
                    ? ` · ${new Date(vendor.registrationPaidAt).toLocaleDateString()}`
                    : ""}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                  Registration unpaid
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                ★ {vendor.rating.toFixed(1)}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                Payout: {vendor.payoutSchedule}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2.5">
              Joined {new Date(vendor.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="rounded-full border border-gray-100 bg-gray-50/60 px-3.5 py-1.5 text-xs outline-none focus:border-accent/40 focus:bg-white transition disabled:opacity-50"
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
              className="text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition"
            >
              Owner profile →
            </Link>
          </div>
        </div>
        {vendor.description && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {vendor.description}
          </p>
        )}
      </div>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Owner
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
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
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          KYC &amp; payout
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
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
            value={formatPaise(vendor.walletBalance)}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Products" value={vendor._count.products.toString()} />
        <Stat label="Items sold" value={stats.unitsSold.toString()} />
        <Stat label="Gross revenue" value={formatPaise(stats.grossRevenue)} accent />
        <Stat label="Net earnings" value={formatPaise(stats.netEarnings)} />
      </div>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Products · {vendor.products.length}
        </p>
        {vendor.products.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No products yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Name</Th>
                  <Th>Price</Th>
                  <Th>Stock</Th>
                  <Th>Views</Th>
                  <Th>Status</Th>
                  <Th>Added</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendor.products.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/product/${p.slug}`}
                        target="_blank"
                        className="font-medium tracking-tight text-[13px] hover:text-accent transition link-accent"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatPaise(p.price)}
                    </td>
                    <td
                      className={`px-4 py-2.5 tabular-nums ${
                        p.stock <= 5 ? "text-rose-600 font-medium" : ""
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {p.views}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.published ? (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Published
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
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
          Payouts · {payouts.length}
        </p>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No payouts yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Gross</Th>
                  <Th>Net</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>Paid</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatPaise(p.amount)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">
                      {formatPaise(p.netAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          PAYOUT_TONE[p.status] ??
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
        {label}
      </p>
      <p className="font-medium tracking-tight break-words mt-0.5">{value}</p>
    </div>
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
