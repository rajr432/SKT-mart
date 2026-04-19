"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Txn {
  id: string;
  // Backend stores signed points (positive = earn, negative = redeem) plus a
  // free-form reason (ORDER_EARN, ORDER_REDEEM, REFERRAL, EXPIRY, …). There
  // is no dedicated `type` column — derive sign/color from points directly.
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

  if (!ready) return <div className="container-page py-8">Loading…</div>;
  if (!token)
    return (
      <div className="container-page py-8">
        <Link className="text-brand" href="/login?next=/account/loyalty">
          Login to view SKT Coins
        </Link>
      </div>
    );

  const balancePaise = d ? d.points * d.valuePaisePerPoint : 0;

  return (
    <div className="container-page py-6 space-y-4">
      <section className="card p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 relative">
          <div className="hero-3d">
            <div
              className="hero-cube w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl shadow-lg"
            >
              🪙
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">SKT Coins</h1>
            <p className="text-sm opacity-90">Earn on every purchase · Redeem on any order</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 relative">
          <div>
            <div className="text-xs opacity-80">Coins Balance</div>
            <div className="text-3xl font-extrabold">{d?.points ?? 0}</div>
          </div>
          <div>
            <div className="text-xs opacity-80">Worth</div>
            <div className="text-3xl font-extrabold">{formatPaise(balancePaise)}</div>
          </div>
          <div>
            <div className="text-xs opacity-80">Max Redeemable</div>
            <div className="text-3xl font-extrabold">{d?.maxRedeemPct ?? 20}%</div>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">How it works</h2>
        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li>Earn <strong>1 coin</strong> for every ₹100 spent (auto-credited on delivery).</li>
          <li>Each coin is worth ₹{((d?.valuePaisePerPoint ?? 100) / 100).toFixed(2)}.</li>
          <li>Redeem up to {d?.maxRedeemPct ?? 20}% of cart value at checkout.</li>
          <li>Bonus coins on flash sales, reviews, and referrals.</li>
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Recent Activity</h2>
        {!d || d.transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet. Shop to earn!</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 text-xs">
              <tr>
                <th className="py-2">Date</th>
                <th>Type</th>
                <th>Reason</th>
                <th className="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {d.transactions.map((t) => {
                const isEarn = t.points > 0;
                const isRedeem = t.points < 0;
                const label = isEarn ? "EARN" : isRedeem ? "REDEEM" : "EXPIRE";
                return (
                  <tr key={t.id} className="border-t">
                    <td className="py-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={
                          isEarn
                            ? "text-brand-green font-semibold"
                            : isRedeem
                              ? "text-red-600 font-semibold"
                              : "text-gray-500"
                        }
                      >
                        {label}
                      </span>
                    </td>
                    <td>{t.reason}</td>
                    <td className="text-right font-mono">
                      {isEarn ? "+" : isRedeem ? "−" : ""}
                      {Math.abs(t.points)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
