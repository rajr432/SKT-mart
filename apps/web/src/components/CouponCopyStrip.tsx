"use client";

import { useState } from "react";

const COUPONS = [
  { code: "WELCOME10", desc: "10% off your first order", min: "₹499+" },
  { code: "SAVE500", desc: "Flat ₹500 off", min: "₹2,999+" },
  { code: "FESTIVE20", desc: "20% off festival sale", min: "₹999+" },
];

export default function CouponCopyStrip() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="card p-4">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <span>🎟️</span> Grab a coupon
      </h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {COUPONS.map((c) => (
          <div
            key={c.code}
            className="border-2 border-dashed border-green-400 bg-green-50 rounded-lg p-3 flex items-center gap-3"
          >
            <div className="flex-1">
              <div className="font-mono font-bold text-green-700">{c.code}</div>
              <div className="text-xs text-gray-600">{c.desc}</div>
              <div className="text-[10px] text-gray-500">Min. {c.min}</div>
            </div>
            <button
              onClick={() => copy(c.code)}
              className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700"
            >
              {copied === c.code ? "Copied!" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
