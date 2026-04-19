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
        className="btn-yellow disabled:opacity-50"
      >
        {loading === "cart" ? "…" : "Add to Cart"}
      </button>
      <button
        onClick={() => addToCart(true)}
        disabled={!inStock || loading === "buy"}
        className="btn-primary disabled:opacity-50"
      >
        {loading === "buy" ? "…" : "Buy Now"}
      </button>
      <button onClick={wishlist} className="btn-outline">
        ♡ Wishlist
      </button>
      <button onClick={share} className="btn-outline">
        ↗ Share
      </button>
    </div>
  );
}
