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

const GRADS = ["flash-grad-1", "flash-grad-2", "flash-grad-3", "flash-grad-4"];

function SaleTile({ sale, idx }: { sale: Sale; idx: number }) {
  const eff = effectivePrice(sale);
  const off = discountPercent(sale.product.mrp, eff);
  const stockLeft = sale.stock != null ? Math.max(0, sale.stock - sale.sold) : null;
  const tt = useCountdown(sale.endAt);
  return (
    <Link
      href={`/product/${sale.product.slug}`}
      className={`min-w-[180px] w-[180px] ${GRADS[idx % GRADS.length]} rounded-3xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="aspect-square relative">
        {sale.product.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sale.product.images[0].url} alt={sale.product.name} className="w-full h-full object-contain p-3" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
        )}
        {off > 0 && (
          <span className="absolute top-2 left-2 tag-pill tag-pill-deal">
            {off}% OFF
          </span>
        )}
      </div>
      <div className="p-3 bg-white/60 backdrop-blur-sm">
        <p className="text-xs line-clamp-2 h-8 font-medium text-ink">{sale.product.name}</p>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="font-bold text-sm text-ink">{formatPaise(eff)}</span>
          <span className="text-[10px] text-ink-muted line-through">{formatPaise(sale.product.mrp)}</span>
        </div>
        <div className="mt-1.5 text-[10px] font-mono font-semibold text-accent-dark">⏱ {tt}</div>
        {stockLeft != null && stockLeft > 0 && stockLeft <= 10 && (
          <p className="text-[10px] text-orange-700 font-medium mt-0.5">Only {stockLeft} left</p>
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
    <section className="card-premium p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-accent to-pink-500 text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
          </span>
          Flash Sales
        </h2>
        <span className="text-xs text-ink-muted">Limited time · {sales.length} live</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {sales.map((s, i) => (
          <SaleTile key={s.id} sale={s} idx={i} />
        ))}
      </div>
    </section>
  );
}
