"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { discountPercent, formatPaise } from "@/lib/api";
import ShareButton from "./ShareButton";
import { addToCompare, isInCompare, removeFromCompare } from "./CompareDrawer";

export default function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url ?? "https://picsum.photos/seed/sktfallback/600/600";
  const off = discountPercent(product.mrp, product.price);
  const showCommission = product.price >= 49900;
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setComparing(isInCompare(product.id));
    const onChange = () => setComparing(isInCompare(product.id));
    window.addEventListener("skt:compare:change", onChange);
    return () => window.removeEventListener("skt:compare:change", onChange);
  }, [product.id]);

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (comparing) {
      removeFromCompare(product.id);
    } else {
      addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: img,
        price: product.price,
      });
    }
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="card p-3 flex flex-col card3d relative group"
    >
      {off > 0 && (
        <span className="absolute top-2 left-2 z-10 bg-brand-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded pop-in">
          {off}% OFF
        </span>
      )}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <ShareButton
          url={`/product/${product.slug}`}
          title={product.name}
          text={`Check out ${product.name} on SKT Mart — ${formatPaise(product.price)}`}
          compact
        />
        <button
          onClick={toggleCompare}
          aria-label={comparing ? "Remove from compare" : "Add to compare"}
          title={comparing ? "Remove from compare" : "Add to compare"}
          className={`text-xs px-1.5 py-0.5 rounded shadow border ${
            comparing
              ? "bg-brand text-white border-brand"
              : "bg-white text-gray-700 border-gray-200 hover:border-brand hover:text-brand"
          }`}
        >
          {comparing ? "✓" : "⇄"}
        </button>
      </div>
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-white flex items-center justify-center overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="object-contain h-full w-full card3d-inner transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="mt-2 flex-1 flex flex-col">
        <h3 className="text-sm line-clamp-2 font-medium text-gray-900">{product.name}</h3>
        {product.brand && <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>}
        <div className="mt-auto pt-2 flex items-center gap-2">
          <span className="text-base font-semibold">{formatPaise(product.price)}</span>
          {off > 0 && (
            <>
              <span className="text-xs text-gray-500 line-through">
                {formatPaise(product.mrp)}
              </span>
              <span className="text-xs text-brand-green font-semibold">{off}% off</span>
            </>
          )}
        </div>
        {showCommission && (
          <p className="text-[10px] text-blue-700 mt-0.5">
            Platform 10% auto-deducted
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {product.rating > 0 && (
            <span className="bg-brand-green text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
              {product.rating.toFixed(1)} ★
            </span>
          )}
          {product.ratingCount > 0 && (
            <span className="text-xs text-gray-500">({product.ratingCount})</span>
          )}
          {product.fAssured && (
            <span className="text-[10px] bg-brand-yellow text-white px-1 rounded">F-Assured</span>
          )}
        </div>
      </div>
    </Link>
  );
}
