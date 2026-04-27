import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | undefined>;
}) {
  const qs = new URLSearchParams({ category: params.slug });
  for (const [k, v] of Object.entries(searchParams)) if (v) qs.set(k, v);

  const [catResp, productsResp] = await Promise.all([
    api<{ category: Category }>(`/api/categories/${params.slug}`).catch(() => null),
    api<{ items: Product[]; total: number }>(`/api/products?${qs.toString()}`).catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  if (!catResp) notFound();

  return (
    <div className="container-page py-4">
      <div className="card p-4 mb-4">
        <h1 className="text-2xl font-semibold">{catResp.category.name}</h1>
        {catResp.category.description && (
          <p className="text-sm text-gray-600 mt-1">{catResp.category.description}</p>
        )}
        {catResp.category.children && catResp.category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {catResp.category.children.map((c) => (
              <a
                key={c.id}
                href={`/category/${c.slug}`}
                className="text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200"
              >
                {c.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {productsResp.items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {productsResp.items.length === 0 && (
        <div className="card p-10 text-center text-gray-600">
          No products in this category yet.
        </div>
      )}
    </div>
  );
}
