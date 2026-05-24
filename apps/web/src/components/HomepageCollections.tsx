import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

type Collection = {
  id: string;
  title: string;
  subtitle?: string;
  productIds: string[];
  layout?: "grid" | "rail";
};

// Server component: reads admin-curated collections from /api/site-content
// and resolves products via /api/products?ids=. Skips collections with no
// resolved products so the homepage doesn't render empty headings.
export default async function HomepageCollections() {
  const { content } = await api<{ content: { collections?: Collection[] } }>(
    "/api/site-content",
  ).catch(() => ({ content: {} as { collections?: Collection[] } }));
  const collections: Collection[] = Array.isArray(content?.collections)
    ? (content.collections as Collection[])
    : [];
  if (collections.length === 0) return null;

  // Single batched fetch for all unique IDs across collections.
  const allIds = Array.from(
    new Set(collections.flatMap((c) => c.productIds).filter(Boolean)),
  ).slice(0, 60);
  if (allIds.length === 0) return null;
  const { items } = await api<{ items: Product[] }>(
    `/api/products?ids=${encodeURIComponent(allIds.join(","))}`,
  ).catch(() => ({ items: [] }));
  const byId = new Map(items.map((p) => [p.id, p] as const));

  return (
    <>
      {collections.map((col) => {
        const products = col.productIds
          .map((id) => byId.get(id))
          .filter((p): p is Product => Boolean(p));
        if (products.length === 0) return null;
        return (
          <section key={col.id} className="card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">{col.title}</h2>
                {col.subtitle && (
                  <p className="text-xs text-gray-500">{col.subtitle}</p>
                )}
              </div>
            </div>
            {col.layout === "rail" ? (
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {products.map((p) => (
                  <div key={p.id} className="min-w-[160px] sm:min-w-[200px]">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
