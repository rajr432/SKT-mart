import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

export const revalidate = 60;

interface StoreData {
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    description: string | null;
    createdAt: string;
  };
  products: Product[];
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const data = await api<StoreData>(`/api/vendor/public/store/${params.slug}`).catch(
    () => null,
  );
  if (!data) notFound();

  const { vendor, products } = data;

  return (
    <div className="container-page py-6 space-y-4">
      <section className="card p-6 bg-gradient-to-br from-brand via-indigo-700 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-white/20 grid place-items-center text-4xl shrink-0">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest opacity-80">Official Store</p>
            <h1 className="text-3xl font-extrabold mt-1 shine-text">{vendor.storeName}</h1>
            {vendor.description && (
              <p className="text-sm opacity-90 mt-1">{vendor.description}</p>
            )}
            <p className="text-[11px] opacity-70 mt-2">
              Seller since {new Date(vendor.createdAt).toLocaleDateString()} · Verified ✓
            </p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-extrabold">{products.length}</p>
            <p className="text-xs">products</p>
          </div>
        </div>
      </section>

      {products.length === 0 ? (
        <div className="card p-10 text-center text-gray-600">
          This store hasn&apos;t listed any products yet. Check back soon!
        </div>
      ) : (
        <>
          <div className="card p-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {Array.from(new Set(products.map((p) => p.category?.name).filter(Boolean))).map(
                (cat) => (
                  <span
                    key={cat as string}
                    className="bg-gray-100 px-3 py-1 rounded-full"
                  >
                    {cat}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}

      <div className="card p-4 text-xs text-gray-600 text-center">
        Questions for this seller?{" "}
        <Link href="/contact" className="text-brand underline">
          Contact SKT Mart support
        </Link>
      </div>
    </div>
  );
}
