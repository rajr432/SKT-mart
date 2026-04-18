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
      <div className="card p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <p className="text-sm opacity-80">Vendor wallet balance</p>
        <p className="text-4xl font-bold mt-2">{formatPaise(balance)}</p>
        <p className="text-xs mt-2 opacity-80">
          Used for ad campaigns & platform fees. Payouts credit here automatically.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Recharge Wallet</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm w-40"
          />
          <span className="text-xs text-gray-500">(paise)</span>
          <button onClick={recharge} className="btn-primary">
            Recharge via Razorpay
          </button>
          <span className="text-xs text-green-600 ml-2">{msg}</span>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Payouts</h2>
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
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{p.status}</span>
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

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Transactions</h2>
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
                    className={`px-2 py-0.5 rounded text-xs ${
                      t.type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
