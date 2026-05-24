"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { api, discountPercent, formatPaise } from "@/lib/api";
import { useAuth } from "./AuthProvider";

const QuickView = dynamic(() => import("./QuickView"), { ssr: false });

export default function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url ?? "https://picsum.photos/seed/sktfallback/600/600";
  const off = discountPercent(product.mrp, product.price);
  const [quickView, setQuickView] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { token } = useAuth();

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;
    setAdding(true);
    try {
      if (token) {
        await api("/api/cart", { token, method: "POST", json: { productId: product.id, quantity: 1 } });
      } else {
        try {
          const raw = localStorage.getItem("skt_guest_cart");
          const arr: { productId: string; qty: number }[] = raw ? JSON.parse(raw) : [];
          const existing = arr.find((x) => x.productId === product.id);
          if (existing) existing.qty += 1;
          else arr.push({ productId: product.id, qty: 1 });
          localStorage.setItem("skt_guest_cart", JSON.stringify(arr));
        } catch {
          /* */
        }
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } catch {
      /* silent — optimistic UI */
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card-premium p-2 sm:p-3 flex flex-col relative group"
    >
      {/* Top-left: discount pill */}
      {off > 0 && (
        <span className="absolute top-3 left-3 z-10 tag-pill tag-pill-deal pop-in">
          {off}% OFF
        </span>
      )}

      {/* Top-right: quick view (subtle, single icon, glass) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setQuickView(true);
        }}
        aria-label="Quick view"
        title="Quick view"
        className="absolute top-3 right-3 z-10 h-8 w-8 grid place-items-center rounded-full glass text-gray-700 hover:text-accent transition opacity-0 group-hover:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {quickView && (
        <QuickView
          productSlug={product.slug}
          onClose={() => setQuickView(false)}
        />
      )}

      {/* Image — rounded-3xl (24px), lifestyle backdrop */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center overflow-hidden rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="object-contain h-full w-full transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Floating "+" add-to-cart button */}
        <button
          onClick={onAdd}
          aria-label={added ? "Added to cart" : "Add to cart"}
          className="fab-add"
        >
          {added ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : adding ? (
            <span className="block h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            "+"
          )}
        </button>
      </div>

      {/* Body — minimal, premium typography */}
      <div className="mt-3 flex-1 flex flex-col px-1">
        <h3 className="text-sm line-clamp-2 font-medium text-ink leading-snug">{product.name}</h3>
        {product.brand && (
          <p className="text-[11px] text-ink-muted mt-0.5 uppercase tracking-wide">{product.brand}</p>
        )}
        <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-bold text-ink">{formatPaise(product.price)}</span>
          {off > 0 && (
            <span className="text-xs text-ink-muted line-through">
              {formatPaise(product.mrp)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {product.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-soft font-medium">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {product.rating.toFixed(1)}
              {product.ratingCount > 0 && (
                <span className="text-ink-muted ml-0.5">({product.ratingCount})</span>
              )}
            </span>
          )}
          {product.fAssured && (
            <span className="tag-pill tag-pill-assured" title="F-Assured: Quality verified">
              ✓ Assured
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
