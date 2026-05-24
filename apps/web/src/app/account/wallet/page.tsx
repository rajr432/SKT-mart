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
    const w = await api<{
      balance: number;
      loyalty: number;
      transactions: WalletTransaction[];
    }>("/api/wallet/", { token });
    setBalance(w.balance);
    setLoyalty(w.loyalty);
    setTxns(w.transactions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function recharge() {
    try {
      await api("/api/wallet/recharge", {
        method: "POST",
        token,
        json: { amountPaise: amt },
      });
      setMsg("Recharged successfully.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="container-page py-6 space-y-5">
      <div className="grid md:grid-cols-2 gap-3">
        <section className="relative overflow-hidden rounded-3xl text-white p-7 shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
          <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">
              SKT wallet
            </p>
            <p className="font-display text-4xl tracking-tightest mt-3">
              {formatPaise(balance)}
            </p>
            <p className="text-xs opacity-80 mt-2">
              Instant refunds &amp; quick checkout balance
            </p>
          </div>
        </section>
        <section className="relative overflow-hidden rounded-3xl text-white p-7 shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
          <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">
              SKT coins
            </p>
            <p className="font-display text-4xl tracking-tightest mt-3">
              {loyalty}
            </p>
            <p className="text-xs opacity-80 mt-2">
              1 coin = ₹1 · max 20% off at checkout
            </p>
          </div>
        </section>
      </div>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Recharge wallet
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative">
            <input
              type="number"
              value={amt}
              onChange={(e) => setAmt(Number(e.target.value))}
              className="rounded-2xl border border-gray-100 bg-gray-50/60 pl-4 pr-16 py-2.5 text-sm w-44 outline-none focus:border-accent/40 focus:bg-white transition tabular-nums"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-gray-400">
              paise
            </span>
          </div>
          <button onClick={recharge} className="btn-primary btn-pill">
            Recharge
          </button>
          {msg && (
            <span className="text-xs text-emerald-600">{msg}</span>
          )}
        </div>
      </section>

      <section className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Transaction history
        </p>
        {txns.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Reason</Th>
                  <Th>Amount</Th>
                  <Th>Balance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          t.type === "CREDIT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-600">
                      {t.reason}
                    </td>
                    <td
                      className={`px-4 py-2.5 tabular-nums font-medium ${
                        t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t.type === "CREDIT" ? "+" : "−"}
                      {formatPaise(t.amountPaise)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatPaise(t.balanceAfter)}
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
