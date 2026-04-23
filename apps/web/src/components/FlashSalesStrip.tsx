"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, formatPaise, discountPercent } from "@/lib/api";

// Live flash-sale ribbon pulled from admin-scheduled /api/flash-sales. Each
// tile shows the scheduled effective price (priceOverride or discountPct
// applied to listed price) and a live countdown to endAt.
type Img = { url: string };
type FlashProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number;
  stock: number;
  images: Img[];
};
type Sale = {
  id: string;
  name: string;
  productId: string;
  discountPct: number | null;
  priceOverride: number | null;
  startAt: string;
  endAt: string;
  stock: number | null;
  sold: number;
  product: FlashProduct;
};

function effectivePrice(s: Sale) {
  if (s.priceOverride != null) return s.priceOverride;
  if (s.discountPct != null) return Math.round(s.product.price * (1 - s.discountPct / 100));
  return s.product.price;
}

function useCountdown(endIso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(endIso).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SaleTile({ sale }: { sale: Sale }) {
  const eff = effectivePrice(sale);
  const off = discountPercent(sale.product.mrp, eff);
  const stockLeft = sale.stock != null ? Math.max(0, sale.stock - sale.sold) : null;
  const tt = useCountdown(sale.endAt);
  return (
    <Link
      href={`/product/${sale.product.slug}`}
      className="min-w-[160px] w-[160px] bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition"
    >
      <div className="aspect-square bg-gray-50 relative">
        {sale.product.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sale.product.images[0].url} alt={sale.product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
        )}
        {off > 0 && (
          <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
            {off}% OFF
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs line-clamp-2 h-8">{sale.product.name}</p>
        <p className="mt-1 font-semibold text-sm">{formatPaise(eff)}</p>
        <p className="text-[10px] text-gray-500 line-through">{formatPaise(sale.product.mrp)}</p>
        <div className="mt-1 text-[10px] font-mono text-red-600">⏱ {tt}</div>
        {stockLeft != null && stockLeft > 0 && stockLeft <= 10 && (
          <p className="text-[10px] text-orange-600 mt-0.5">Only {stockLeft} left</p>
        )}
      </div>
    </Link>
  );
}

export default function FlashSalesStrip() {
  const [sales, setSales] = useState<Sale[]>([]);
  useEffect(() => {
    api<{ items: Sale[] }>("/api/flash-sales")
      .then((r) => setSales(r.items))
      .catch(() => setSales([]));
  }, []);

  if (sales.length === 0) return null;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="text-xl">⚡</span> Flash Sales
        </h2>
        <span className="text-xs text-gray-500">Limited time · {sales.length} live</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {sales.map((s) => (
          <SaleTile key={s.id} sale={s} />
        ))}
      </div>
    </section>
  );
}
