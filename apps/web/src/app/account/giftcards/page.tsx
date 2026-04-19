"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface GiftCard {
  id: string;
  code: string;
  amountPaise: number;
  balancePaise: number;
  recipient?: string | null;
  message?: string | null;
  expiresAt: string;
  createdAt: string;
}

export default function GiftCardsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<GiftCard[]>([]);
  const [buy, setBuy] = useState({ amount: 50000, recipient: "", message: "" });
  const [redeem, setRedeem] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const r = await api<{ items: GiftCard[] }>("/api/giftcards/mine", { token });
    setItems(r.items);
  }

  useEffect(() => { load(); }, [token]);

  async function doBuy() {
    try {
      await api("/api/giftcards/buy", { method: "POST", token, json: {
        amountPaise: buy.amount, recipient: buy.recipient, message: buy.message,
      } });
      setMsg("Gift card created!");
      load();
    } catch (e) { setMsg((e as Error).message); }
  }

  async function doRedeem() {
    try {
      const r = await api<{ creditedPaise: number }>("/api/giftcards/redeem", { method: "POST", token, json: { code: redeem } });
      setMsg(`Credited ${formatPaise(r.creditedPaise)} to wallet`);
      setRedeem("");
      load();
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Gift Cards</h1>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Buy a Gift Card</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <input type="number" value={buy.amount} onChange={(e) => setBuy({ ...buy, amount: Number(e.target.value) })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Recipient name" value={buy.recipient} onChange={(e) => setBuy({ ...buy, recipient: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Message" value={buy.message} onChange={(e) => setBuy({ ...buy, message: e.target.value })} className="border rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={doBuy} className="btn-primary">Buy</button>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Redeem a Code</h2>
        <div className="flex gap-2">
          <input value={redeem} onChange={(e) => setRedeem(e.target.value.toUpperCase())} placeholder="GIFTCODE" className="border rounded px-3 py-2 text-sm font-mono" />
          <button onClick={doRedeem} className="btn-primary">Redeem to Wallet</button>
        </div>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">My Gift Cards</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr><th className="py-2">Code</th><th>Amount</th><th>Balance</th><th>Recipient</th><th>Expires</th></tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className="border-b">
                <td className="py-2 font-mono text-xs">{g.code}</td>
                <td>{formatPaise(g.amountPaise)}</td>
                <td>{formatPaise(g.balancePaise)}</td>
                <td className="text-xs">{g.recipient}</td>
                <td className="text-xs">{new Date(g.expiresAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-500">No gift cards</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
