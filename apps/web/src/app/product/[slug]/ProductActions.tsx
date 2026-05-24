"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

export default function ProductActions({
  productId,
  inStock,
}: {
  productId: string;
  inStock: boolean;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const addToCart = async (buyNow = false) => {
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(buyNow ? "buy" : "cart");
    try {
      await api("/api/cart", { token, method: "POST", json: { productId, quantity: 1 } });
      if (buyNow) router.push("/checkout");
      else router.push("/cart");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const wishlist = async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      await api("/api/wishlist", { token, method: "POST", json: { productId } });
      alert("Added to wishlist");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = {
      title: document.title,
      text: "Check out this product on SKT Mart",
      url,
    };
    // Prefer native share sheet on mobile; fall back to clipboard.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: typeof data) => Promise<void> }).share(data);
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Product link copied!");
    } catch {
      alert(url);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => addToCart(false)}
        disabled={!inStock || loading === "cart"}
        className="btn-pill bg-white border-2 border-accent text-accent hover:bg-accent/5 disabled:opacity-50"
      >
        {loading === "cart" ? "…" : "Add to Cart"}
      </button>
      <button
        onClick={() => addToCart(true)}
        disabled={!inStock || loading === "buy"}
        className="btn-pill bg-accent text-white hover:bg-accent-dark disabled:opacity-50 shadow-lg shadow-accent/30"
      >
        {loading === "buy" ? "…" : "Buy Now →"}
      </button>
      <button
        onClick={wishlist}
        className="btn-pill bg-gray-100 hover:bg-gray-200 text-ink-soft text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Wishlist
      </button>
      <button
        onClick={share}
        className="btn-pill bg-gray-100 hover:bg-gray-200 text-ink-soft text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
    </div>
  );
}
