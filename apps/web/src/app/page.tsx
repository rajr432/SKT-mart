import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { Banner, Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ items: banners }, { items: categories }, { items: products }] = await Promise.all([
    api<{ items: Banner[] }>("/api/banners").catch(() => ({ items: [] })),
    api<{ items: Category[] }>("/api/categories").catch(() => ({ items: [] })),
    api<{ items: Product[]; total: number }>("/api/products?limit=16").catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  return (
    <div className="container-page py-4 space-y-4">
      <div className="card p-3">
        <div className="flex gap-4 overflow-x-auto pb-1">
          {categories.slice(0, 10).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-1 min-w-[72px] hover:text-brand"
            >
              <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                {c.name[0]}
              </div>
              <span className="text-xs font-medium text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {banners[0] && (
        <Link href={banners[0].link ?? "#"} className="block card overflow-hidden">
          <img
            src={banners[0].image}
            alt={banners[0].title}
            className="w-full h-44 sm:h-64 object-cover"
          />
        </Link>
      )}

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Deals of the Day</h2>
          <Link href="/search?sort=newest" className="text-sm text-brand">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {banners.slice(1, 3).map((b) => (
          <Link key={b.id} href={b.link ?? "#"} className="card overflow-hidden">
            <img src={b.image} alt={b.title} className="w-full h-40 object-cover" />
          </Link>
        ))}
      </div>

      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3">Best Sellers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.slice(0, 15).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
