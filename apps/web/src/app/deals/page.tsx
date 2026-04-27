import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import FlashDealTimer from "@/components/FlashDealTimer";
import { api, discountPercent } from "@/lib/api";
import { getPageSeo } from "@/lib/seo";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata() {
  return await getPageSeo("deals");
}

export default async function DealsPage() {
  const { items: products } = await api<{ items: Product[] }>(
    "/api/products?limit=60",
  ).catch(() => ({ items: [] as Product[] }));

  const tiers = [
    { label: "50% OFF and above", min: 50, color: "from-red-500 to-rose-600" },
    { label: "30–50% OFF", min: 30, max: 49, color: "from-orange-500 to-amber-600" },
    { label: "10–30% OFF", min: 10, max: 29, color: "from-blue-500 to-indigo-600" },
  ];

  return (
    <div className="container-page py-6 space-y-4">
      <section className="card p-6 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="flex items-center justify-between relative">
          <div>
            <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest">
              Mega Sale
            </div>
            <h1 className="text-4xl font-extrabold mt-2 shine-text">Today&apos;s Deals</h1>
            <p className="mt-1 opacity-90">Ends in</p>
            <div className="mt-2">
              <FlashDealTimer />
            </div>
          </div>
          <div className="text-7xl animate-pulse">🔥</div>
        </div>
      </section>

      {tiers.map((t) => {
        const list = products.filter((p) => {
          const off = discountPercent(p.mrp, p.price);
          return off >= t.min && (t.max ? off <= t.max : true);
        });
        if (list.length === 0) return null;
        return (
          <section key={t.label} className="card p-4">
            <div className={`bg-gradient-to-r ${t.color} text-white px-4 py-2 rounded mb-3 flex items-center justify-between`}>
              <h2 className="text-lg font-bold">{t.label}</h2>
              <Link href="/search" className="text-sm underline">
                View All
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
    </div>
  );
}
