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

  const q = searchParams.q;

  return (
    <div className="container-page py-5 flex gap-5">
      <aside className="w-60 shrink-0 hidden md:block">
        <div className="card-premium p-5 sticky top-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Refine</p>
          <h3 className="font-display text-base tracking-tight mb-4">Filters</h3>
          <form className="space-y-5 text-sm">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                Price (₹)
              </label>
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
              <p className="text-[10px] text-gray-400 mt-1.5">in paise (99900 = ₹999)</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                Brand
              </label>
              <input name="brand" defaultValue={searchParams.brand} className="input" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                Min rating
              </label>
              <select
                name="rating"
                defaultValue={searchParams.rating ?? ""}
                className="input"
              >
                <option value="">Any</option>
                <option value="4">4★ &amp; above</option>
                <option value="3">3★ &amp; above</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name="fAssured"
                value="true"
                defaultChecked={searchParams.fAssured === "true"}
                className="h-4 w-4 accent-[color:var(--accent)]"
              />
              <span className="font-medium tracking-tight">Assured only</span>
            </label>
            <input type="hidden" name="q" value={q ?? ""} />
            <button className="btn-primary w-full">Apply filters</button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="card-premium p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
              {q ? "Results for" : "All products"}
            </p>
            <p className="font-display text-base tracking-tight">
              {q ? `"${q}"` : "Browse"}{" "}
              <span className="text-gray-400 font-sans text-sm font-normal">
                · {data.total} results
              </span>
            </p>
          </div>
          <form className="flex items-center gap-2 text-sm">
            {Object.entries(searchParams).map(([k, v]) =>
              k === "sort" ? null : <input key={k} type="hidden" name={k} value={v ?? ""} />,
            )}
            <label className="text-xs text-gray-500">Sort</label>
            <select
              name="sort"
              defaultValue={searchParams.sort ?? ""}
              className="input !w-auto"
            >
              <option value="">Relevance</option>
              <option value="price_asc">Price — Low to High</option>
              <option value="price_desc">Price — High to Low</option>
              <option value="rating">Top rated</option>
              <option value="newest">Newest first</option>
            </select>
            <button className="btn-outline">Go</button>
          </form>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {data.items.length === 0 && (
          <div className="card-premium p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 grid place-items-center mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-7 w-7 text-accent"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <p className="font-display text-base tracking-tight">No products found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different keyword or relax filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
