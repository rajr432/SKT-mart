import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatPaise } from "@/lib/api";

export default function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url ?? "https://picsum.photos/seed/sktfallback/600/600";
  const off = discountPercent(product.mrp, product.price);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="card p-3 flex flex-col hover:shadow-md transition"
    >
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        <img
          src={img}
          alt={product.name}
          className="object-contain h-full w-full"
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
