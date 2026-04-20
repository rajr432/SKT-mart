"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  active: boolean;
  startsAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
}

const fmt = (p: number) => `₹${(p / 100).toFixed(0)}`;

export default function MyCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coupons`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const active = items.filter(
    (c) =>
      c.active &&
      (!c.expiresAt || new Date(c.expiresAt) > new Date()) &&
      (!c.usageLimit || c.usedCount < c.usageLimit),
  );
  const expired = items.filter(
    (c) =>
      !c.active ||
      (c.expiresAt && new Date(c.expiresAt) <= new Date()) ||
      (c.usageLimit && c.usedCount >= c.usageLimit),
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Available Coupons</h1>
        <p className="text-xs text-gray-500 mt-1">
          Copy the code and paste at checkout. Best coupon is always applied when you enter it.
        </p>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Loading…</div>
      ) : active.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          No active coupons right now. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((c) => (
            <div
              key={c.id}
              className="relative card p-4 overflow-hidden bg-gradient-to-br from-brand/5 to-brand-green/10 border-2 border-dashed border-brand/30"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand font-bold">
                    {c.type === "PERCENT" ? `${c.value}% OFF` : `${fmt(c.value)} OFF`}
                  </p>
                  <p className="font-semibold mt-1">{c.title}</p>
                  {c.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.description}</p>
                  )}
                  <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                    <p>Min order: {fmt(c.minOrder)}</p>
                    {c.maxDiscount && <p>Max discount: {fmt(c.maxDiscount)}</p>}
                    {c.expiresAt && (
                      <p>Expires: {new Date(c.expiresAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded font-mono font-bold text-sm border border-dashed border-brand tracking-widest">
                  {c.code}
                </code>
                <button
                  onClick={() => copy(c.code)}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {copied === c.code ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <div className="card p-4 opacity-70">
          <h2 className="text-sm font-semibold mb-2 text-gray-600">Expired / Used up</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {expired.map((c) => (
              <div key={c.id} className="border border-dashed rounded px-2 py-1 font-mono">
                {c.code}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 text-xs text-gray-600 text-center">
        Need help with coupons?{" "}
        <Link href="/contact" className="text-brand underline">
          Contact support
        </Link>
      </div>
    </div>
  );
}
