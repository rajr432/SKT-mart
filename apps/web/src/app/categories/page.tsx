import Link from "next/link";
import { api } from "@/lib/api";
import { getPageSeo } from "@/lib/seo";
import type { Category } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata() {
  return await getPageSeo("categories");
}

interface CategoryWithImage extends Category {
  image?: string | null;
}

const PALETTE = [
  "from-violet-500/90 via-fuchsia-500/80 to-rose-500/80",
  "from-rose-400/90 via-orange-400/80 to-amber-400/80",
  "from-sky-500/90 via-indigo-500/80 to-violet-500/80",
  "from-emerald-500/90 via-teal-500/80 to-cyan-500/80",
  "from-amber-400/90 via-rose-400/80 to-fuchsia-400/80",
  "from-fuchsia-500/90 via-purple-500/80 to-indigo-500/80",
];

export default async function CategoriesPage() {
  const { items } = await api<{ items: CategoryWithImage[] }>("/api/categories").catch(
    () => ({ items: [] as CategoryWithImage[] }),
  );

  return (
    <div className="container-page py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl text-white p-8 sm:p-10 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Discover</p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-2">
            All categories
          </h1>
          <p className="opacity-90 mt-2 text-sm max-w-md">
            Explore {items.length} curated collections. Find exactly what you&apos;re looking for.
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 grid place-items-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-7 w-7 text-accent"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <p className="font-display text-base tracking-tight">No categories yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Admin can add them from{" "}
            <Link href="/admin" className="link-accent">
              Admin → Categories
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {items.map((c, i) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group relative aspect-[4/5] rounded-3xl overflow-hidden shadow-soft hover:shadow-glow/40 transition-all"
            >
              {c.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${PALETTE[i % PALETTE.length]}`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                <p className="font-display text-lg sm:text-xl tracking-tight leading-tight">
                  {c.name}
                </p>
                {c.children && c.children.length > 0 && (
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-80 mt-1">
                    {c.children.length} sub-{c.children.length === 1 ? "category" : "categories"}
                  </p>
                )}
                <p className="text-[11px] uppercase tracking-[0.18em] mt-3 inline-flex items-center gap-1 opacity-95">
                  Shop now <span className="transition group-hover:translate-x-0.5">→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
