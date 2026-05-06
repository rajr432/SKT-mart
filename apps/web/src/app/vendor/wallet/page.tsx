"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { WalletTransaction, Payout } from "@/lib/types";

export default function VendorWalletPage() {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amt, setAmt] = useState(100000);
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const w = await api<{ balance: number; transactions: WalletTransaction[] }>("/api/wallet/vendor", { token });
    setBalance(w.balance);
    setTxns(w.transactions);
    const p = await api<{ items: Payout[] }>("/api/payouts/mine", { token });
    setPayouts(p.items);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function recharge() {
    if (amt <= 0) return;
    try {
      await api("/api/wallet/vendor/recharge", {
        method: "POST",
        token,
        json: { amountPaise: amt },
      });
      setMsg("Recharged (dev mode). In production this opens Razorpay.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl text-white p-7 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Vendor wallet</p>
          <p className="font-display text-4xl sm:text-5xl tracking-tightest mt-3">{formatPaise(balance)}</p>
          <p className="text-xs mt-3 opacity-90 max-w-md">
            Used for ad campaigns &amp; platform fees. Payouts credit here automatically.
          </p>
        </div>
      </div>

      <section className="card-premium p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Recharge</p>
        <h2 className="font-display text-base tracking-tight mb-4">Top up wallet</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(Number(e.target.value))}
            className="input !w-44"
          />
          <span className="text-xs text-gray-400">(paise)</span>
          <button onClick={recharge} className="btn-primary">
            Recharge via Razorpay
          </button>
          {msg && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {msg}
            </span>
          )}
        </div>
      </section>

      <section className="card-premium p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Vendor</p>
        <h2 className="font-display text-base tracking-tight mb-4">Payouts</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Period</th>
              <th>Gross</th>
              <th>Commission</th>
              <th>Ad spend</th>
              <th>Net</th>
              <th>Status</th>
              <th>UTR</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2 text-xs">
                  {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td>{formatPaise(p.grossSales)}</td>
                <td>-{formatPaise(p.totalCommission)}</td>
                <td>-{formatPaise(p.totalAdSpend)}</td>
                <td className="font-semibold">{formatPaise(p.netAmount)}</td>
                <td>
                  <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">{p.status}</span>
                </td>
                <td className="text-[11px] font-mono">{p.utr ?? "-"}</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  No payouts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card-premium p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Activity</p>
        <h2 className="font-display text-base tracking-tight mb-4">Transactions</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                      t.type === "CREDIT"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="text-xs">{t.reason}</td>
                <td className={t.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
                  {t.type === "CREDIT" ? "+" : "-"}
                  {formatPaise(t.amountPaise)}
                </td>
                <td>{formatPaise(t.balanceAfter)}</td>
                <td className="text-[11px]">{t.note}</td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
