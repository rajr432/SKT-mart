"use client";

import { useEffect, useState } from "react";

const OFFERS = [
  "🎉 First order? Use WELCOME10 — get 10% off (up to ₹500)",
  "🚚 FREE delivery on orders ₹500+ across 29,000+ pincodes",
  "💳 Extra 5% off with SKT Wallet payments",
  "🪙 Earn 1 SKT Coin on every ₹10 spent — 100 coins = ₹10 off",
  "🎁 Buy gift cards from ₹100 — delivered instantly by email",
  "↩️ 7-day no-questions-asked returns + instant wallet refund",
];

/** Rotating top-strip announcement bar. Safe to remove and add back without
 * touching the rest of the layout — sits above the header. */
export default function OfferStrip() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % OFFERS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="bg-gradient-to-r from-[#2874f0] via-[#7b4bff] to-[#2874f0] text-white text-center text-xs py-1.5 overflow-hidden relative">
      <div key={i} className="animate-slide-in px-2">{OFFERS[i]}</div>
    </div>
  );
}
