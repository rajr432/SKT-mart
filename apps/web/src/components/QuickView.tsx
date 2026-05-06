"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { api, discountPercent, formatPaise } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface Props {
  productSlug: string;
  onClose: () => void;
}

export default function QuickView({ productSlug, onClose }: Props) {
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api<{ product: Product }>(`/api/products/${productSlug}`).then((r) =>
      setProduct(r.product),
    );
  }, [productSlug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addToCart = async () => {
    if (!token || !product) return;
    setAdding(true);
    try {
      await api("/api/cart", {
        token,
        method: "POST",
        json: { productId: product.id, quantity: 1 },
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setAdding(false);
    }
  };

  if (!product) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="bg-white rounded-xl p-8 animate-pulse">Loading…</div>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images.map((i) => i.url)
    : ["https://picsum.photos/seed/sktfallback/600/600"];
  const off = discountPercent(product.mrp, product.price);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-2 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative bg-gray-50 p-4 flex items-center justify-center min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[imgIdx]}
            alt={product.name}
            className="max-h-[350px] object-contain"
          />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-2 h-2 rounded-full ${
                    i === imgIdx ? "bg-brand" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-800"
          >
            x
          </button>
        </div>

        {/* Details */}
        <div className="p-5 flex flex-col">
          <h2 className="text-lg font-semibold line-clamp-2">{product.name}</h2>
          {product.brand && (
            <p className="text-sm text-gray-500 mt-1">{product.brand}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {product.rating > 0 && (
              <span className="bg-brand-green text-white text-xs px-2 py-0.5 rounded">
                {product.rating.toFixed(1)} ★
              </span>
            )}
            {product.ratingCount > 0 && (
              <span className="text-xs text-gray-500">
                {product.ratingCount} ratings
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatPaise(product.price)}
            </span>
            {off > 0 && (
              <>
                <span className="text-sm text-gray-500 line-through">
                  {formatPaise(product.mrp)}
                </span>
                <span className="text-sm text-brand-green font-semibold">
                  {off}% off
                </span>
              </>
            )}
          </div>

          {product.fAssured && (
            <span className="tag-pill tag-pill-assured mt-2 w-fit">
              ✓ Assured
            </span>
          )}

          <p className="text-sm text-ink-soft mt-3 line-clamp-4">
            {product.description}
          </p>

          <div className="mt-auto pt-4 flex gap-2">
            <button
              onClick={addToCart}
              disabled={adding || product.stock <= 0}
              className="btn-pill bg-accent text-white flex-1 hover:bg-accent-dark disabled:opacity-50"
            >
              {product.stock <= 0
                ? "Out of stock"
                : added
                  ? "Added ✓"
                  : adding
                    ? "Adding…"
                    : "Add to cart"}
            </button>
            <Link
              href={`/product/${product.slug}`}
              className="btn-pill border border-gray-200 bg-white text-ink hover:bg-gray-50 flex-1 text-center"
              onClick={onClose}
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
