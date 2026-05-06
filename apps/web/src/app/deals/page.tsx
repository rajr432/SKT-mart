import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import FlashDealTimer from "@/components/FlashDealTimer";
import { api, discountPercent } from "@/lib/api";
import { getPageSeo } from "@/lib/seo";
import type { Product } from "@/lib/types";

export const revalidate = 180;

export async function generateMetadata() {
  return await getPageSeo("deals");
}

export default async function DealsPage() {
  const { items: products } = await api<{ items: Product[] }>(
    "/api/products?limit=60",
  ).catch(() => ({ items: [] as Product[] }));

  const tiers = [
    {
      label: "50% off and above",
      min: 50,
      accent: "from-rose-500 via-fuchsia-500 to-violet-500",
    },
    {
      label: "30 – 50% off",
      min: 30,
      max: 49,
      accent: "from-amber-500 via-orange-500 to-rose-500",
    },
    {
      label: "10 – 30% off",
      min: 10,
      max: 29,
      accent: "from-violet-500 via-indigo-500 to-sky-500",
    },
  ];

  return (
    <div className="container-page py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl text-white p-8 sm:p-10 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Limited time</p>
            <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-2">
              Today&apos;s deals
            </h1>
            <p className="opacity-90 mt-2 text-sm">Hand-picked offers, refreshed daily.</p>
            <div className="mt-4 inline-flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <span className="text-[10px] uppercase tracking-wider opacity-80">Ends in</span>
              <FlashDealTimer />
            </div>
          </div>
        </div>
      </section>

      {tiers.map((t) => {
        const list = products.filter((p) => {
          const off = discountPercent(p.mrp, p.price);
          return off >= t.min && (t.max ? off <= t.max : true);
        });
        if (list.length === 0) return null;
        return (
          <section key={t.label} className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
                  Discount tier
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${t.accent}`} />
                  <h2 className="font-display text-lg sm:text-xl tracking-tight">
                    {t.label}
                  </h2>
                </div>
              </div>
              <Link href="/search" className="link-accent text-xs">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {list.slice(0, 10).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        );
      })}

      {products.length === 0 && (
        <div className="card-premium p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 grid place-items-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-7 w-7 text-accent"
            >
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10Z" />
            </svg>
          </div>
          <p className="font-display text-base tracking-tight">No deals right now</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon for fresh offers.</p>
        </div>
      )}
    </div>
  );
}
