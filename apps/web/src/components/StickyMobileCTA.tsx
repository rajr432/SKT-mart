"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

// Mobile-only sticky Add-to-Cart / Buy-Now bar. Appears after the user
// scrolls past the primary action buttons on PDP so it never competes for
// space on the fold. Hidden on md+ (desktop has the inline ProductActions).
export default function StickyMobileCTA({
  productId,
  price,
  inStock,
}: {
  productId: string;
  price: number;
  inStock: boolean;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const act = async (buyNow: boolean) => {
    if (!inStock) return;
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(buyNow ? "buy" : "cart");
    try {
      await api("/api/cart", { token, method: "POST", json: { productId, quantity: 1 } });
      router.push(buyNow ? "/checkout" : "/cart");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed bottom-[64px] inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1 min-w-0 px-1">
          <p className="text-xs text-gray-500">Price</p>
          <p className="font-semibold truncate">{formatPaise(price)}</p>
        </div>
        <button
          onClick={() => act(false)}
          disabled={!inStock || loading === "cart"}
          className="btn-yellow text-sm px-3 py-2 disabled:opacity-50"
        >
          {loading === "cart" ? "…" : "Add"}
        </button>
        <button
          onClick={() => act(true)}
          disabled={!inStock || loading === "buy"}
          className="btn-primary text-sm px-3 py-2 disabled:opacity-50"
        >
          {loading === "buy" ? "…" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
