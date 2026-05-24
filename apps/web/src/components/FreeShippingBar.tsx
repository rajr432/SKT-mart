"use client";

import { useEffect, useState } from "react";
import { api, formatPaise } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface CartResp {
  items: { quantity: number; product: { price: number } }[];
}

/** Shows progress toward the free-shipping threshold on cart page. */
export default function FreeShippingBar() {
  const { token } = useAuth();
  const [subtotal, setSubtotal] = useState(0);
  const [threshold, setThreshold] = useState(50000); // paise; default ₹500

  useEffect(() => {
    if (!token) return;
    api<CartResp>("/api/cart", { token })
      .then((r) =>
        setSubtotal(r.items.reduce((s, it) => s + it.product.price * it.quantity, 0)),
      )
      .catch(() => {});
    api<{ freeShippingMin: number }>("/api/settings/public")
      .then((s) => setThreshold(s.freeShippingMin ?? 50000))
      .catch(() => {});
  }, [token]);

  if (subtotal === 0) return null;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);
  const done = remaining === 0;

  return (
    <div className="card p-3 bg-gradient-to-r from-brand/5 to-brand-green/5 border-brand/20">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">
          {done ? "🎉 You unlocked FREE delivery!" : `Add ${formatPaise(remaining)} more for FREE delivery`}
        </span>
        <span className="text-xs text-gray-500">{formatPaise(subtotal)} / {formatPaise(threshold)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-brand-green" : "bg-gradient-to-r from-brand to-brand-green"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
