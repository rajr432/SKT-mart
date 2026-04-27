import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import { getPageSeo } from "@/lib/seo";
import type { Product } from "@/lib/types";

export const revalidate = 30;

export async function generateMetadata() {
  return await getPageSeo("search");
}

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (v) params.set(k, v);

  const data = await api<{ items: Product[]; total: number }>(
    `/api/products?${params.toString()}`,
  ).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="container-page py-4 flex gap-4">
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="card p-4 sticky top-20">
          <h3 className="font-semibold text-sm mb-3">Filters</h3>
          <form className="space-y-4 text-sm">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Price (₹)</label>
              <div className="flex gap-2">
                <input
                  name="minPrice"
                  defaultValue={searchParams.minPrice}
                  placeholder="Min"
                  className="input"
                />
                <input
                  name="maxPrice"
                  defaultValue={searchParams.maxPrice}
                  placeholder="Max"
                  className="input"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">in paise (e.g. 99900 = ₹999)</p>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Brand</label>
              <input name="brand" defaultValue={searchParams.brand} className="input" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min rating</label>
              <select name="rating" defaultValue={searchParams.rating ?? ""} className="input">
                <option value="">Any</option>
                <option value="4">4★ & above</option>
                <option value="3">3★ & above</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="fAssured"
                value="true"
                defaultChecked={searchParams.fAssured === "true"}
              />
              F-Assured only
            </label>
            <input type="hidden" name="q" value={searchParams.q ?? ""} />
            <button className="btn-primary w-full">Apply</button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <div className="card p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {data.total} results {searchParams.q ? `for "${searchParams.q}"` : ""}
          </p>
          <form className="flex items-center gap-2 text-sm">
            {Object.entries(searchParams).map(([k, v]) =>
              k === "sort" ? null : <input key={k} type="hidden" name={k} value={v ?? ""} />,
            )}
            <label>Sort:</label>
            <select name="sort" defaultValue={searchParams.sort ?? ""} className="input !w-auto">
              <option value="">Relevance</option>
              <option value="price_asc">Price — Low to High</option>
              <option value="price_desc">Price — High to Low</option>
              <option value="rating">Top rated</option>
              <option value="newest">Newest first</option>
            </select>
            <button className="btn-outline">Apply</button>
          </form>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {data.items.length === 0 && (
          <div className="card p-10 text-center text-gray-600">
            No products found. Try different filters.
          </div>
        )}
      </div>
    </div>
  );
}
