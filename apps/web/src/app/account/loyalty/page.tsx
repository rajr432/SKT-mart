"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Txn {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
}

interface LoyaltyData {
  points: number;
  valuePaisePerPoint: number;
  maxRedeemPct: number;
  transactions: Txn[];
}

export default function LoyaltyPage() {
  const { token, ready } = useAuth();
  const [d, setD] = useState<LoyaltyData | null>(null);

  useEffect(() => {
    if (ready && token)
      api<LoyaltyData>("/api/loyalty", { token })
        .then(setD)
        .catch(() => setD(null));
  }, [ready, token]);

  if (!ready)
    return (
      <div className="container-page py-8 space-y-3">
        <div className="skeleton-shimmer h-44 w-full rounded-3xl" />
        <div className="skeleton-shimmer h-32 w-full rounded-2xl" />
      </div>
    );
  if (!token)
    return (
      <div className="container-page py-12 text-center">
        <p className="text-sm text-gray-500 mb-3">
          Login to view your SKT Coins balance.
        </p>
        <Link
          className="btn-primary btn-pill inline-block"
          href="/login?next=/account/loyalty"
        >
          Login →
        </Link>
      </div>
    );

  const balancePaise = d ? d.points * d.valuePaisePerPoint : 0;

  return (
    <div className="container-page py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl text-white p-7 sm:p-9 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
        <div className="absolute -top-12 -right-10 h-52 w-52 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">
            Earn &amp; redeem
          </p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-1">
            SKT Coins
          </h1>
          <p className="opacity-90 mt-1.5 text-sm">
            Earn on every purchase · redeem on any order
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Stat label="Coins balance" value={(d?.points ?? 0).toString()} />
            <Stat label="Worth" value={formatPaise(balancePaise)} />
            <Stat
              label="Max redeemable"
              value={`${d?.maxRedeemPct ?? 20}%`}
            />
          </div>
        </div>
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          How it works
        </p>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-700">
          {[
            ["1 coin", "for every \u20b9100 spent (auto-credited on delivery)"],
            [
              `₹${((d?.valuePaisePerPoint ?? 100) / 100).toFixed(2)}`,
              "is the value of each coin at checkout",
            ],
            [
              `${d?.maxRedeemPct ?? 20}%`,
              "of cart can be paid using coins on any order",
            ],
            ["Bonus", "coins on flash sales, reviews and referrals"],
          ].map(([k, v], i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-grid h-6 min-w-[3rem] place-items-center rounded-full bg-violet-50 text-accent text-[11px] font-semibold tracking-tight border border-violet-100 px-2">
                {k}
              </span>
              <span className="leading-relaxed">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Recent activity
        </p>
        {!d || d.transactions.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h4.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              No transactions yet. Shop to earn coins!
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Reason</Th>
                  <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.transactions.map((t) => {
                  const isEarn = t.points > 0;
                  const isRedeem = t.points < 0;
                  const label = isEarn ? "EARN" : isRedeem ? "REDEEM" : "EXPIRE";
                  const tone = isEarn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isRedeem
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-gray-50 text-gray-600 border-gray-200";
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-violet-50/30 transition"
                    >
                      <td className="px-4 py-2.5 text-[11px] text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tone}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-600">
                        {t.reason}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                          isEarn
                            ? "text-emerald-600"
                            : isRedeem
                              ? "text-rose-600"
                              : "text-gray-500"
                        }`}
                      >
                        {isEarn ? "+" : isRedeem ? "−" : ""}
                        {Math.abs(t.points)}
                      </td>
                    </tr>
                  );
                })}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] opacity-80">
        {label}
      </p>
      <p className="font-display text-2xl tracking-tightest mt-0.5">
        {value}
      </p>
    </div>
  );
}
