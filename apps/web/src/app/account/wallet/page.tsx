"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { WalletTransaction } from "@/lib/types";

export default function WalletPage() {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loyalty, setLoyalty] = useState(0);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [amt, setAmt] = useState(50000);
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const w = await api<{ balance: number; loyalty: number; transactions: WalletTransaction[] }>("/api/wallet/", { token });
    setBalance(w.balance);
    setLoyalty(w.loyalty);
    setTxns(w.transactions);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function recharge() {
    try {
      await api("/api/wallet/recharge", { method: "POST", token, json: { amountPaise: amt } });
      setMsg("Recharged (dev mode).");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-6 bg-gradient-to-br from-purple-600 to-purple-800 text-white">
          <p className="text-sm opacity-80">SKT Wallet</p>
          <p className="text-4xl font-bold mt-2">{formatPaise(balance)}</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
          <p className="text-sm opacity-80">SKT Coins</p>
          <p className="text-4xl font-bold mt-2">{loyalty}</p>
          <p className="text-xs mt-1 opacity-80">1 coin = ₹1 at checkout (max 20% of cart)</p>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Recharge Wallet</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm w-40"
          />
          <span className="text-xs text-gray-500 self-center">paise</span>
          <button onClick={recharge} className="btn-primary">Recharge</button>
          <span className="text-xs text-green-600 self-center">{msg}</span>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Transaction History</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs ${t.type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.type}</span>
                </td>
                <td className="text-xs">{t.reason}</td>
                <td className={t.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
                  {t.type === "CREDIT" ? "+" : "-"}{formatPaise(t.amountPaise)}
                </td>
                <td>{formatPaise(t.balanceAfter)}</td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">No transactions</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
