import Link from "next/link";
import { api } from "@/lib/api";
import { getPageSeo } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  return await getPageSeo("brands");
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  featured?: boolean;
}

const PALETTE = [
  "from-violet-500 via-fuchsia-500 to-rose-500",
  "from-rose-400 via-orange-400 to-amber-400",
  "from-sky-500 via-indigo-500 to-violet-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-400 via-rose-400 to-fuchsia-400",
  "from-fuchsia-500 via-purple-500 to-indigo-500",
];

export default async function BrandsPage() {
  const { items } = await api<{ items: Brand[] }>("/api/brands").catch(() => ({
    items: [] as Brand[],
  }));

  return (
    <div className="container-page py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl text-white p-8 sm:p-10 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Curated</p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-2">
            Top brands
          </h1>
          <p className="opacity-90 mt-2 text-sm max-w-md">
            Shop from the world&apos;s most-loved brands, all in one place.
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
              <path d="m20 7-3 12H7L4 7l4 3 4-6 4 6 4-3Z" />
            </svg>
          </div>
          <p className="font-display text-base tracking-tight">No brands yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Admin can add them from{" "}
            <Link href="/admin/brands" className="link-accent">
              Admin → Brands
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((b, i) => (
            <Link
              key={b.id}
              href={`/search?q=${encodeURIComponent(b.name)}`}
              className="group relative card-premium aspect-[5/4] overflow-hidden hover:shadow-glow/40 transition"
            >
              <div
                className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${PALETTE[i % PALETTE.length]}`}
              />
              <div className="absolute inset-0 grid place-items-center p-5">
                {b.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="max-h-16 max-w-[70%] object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <p className="font-display text-xl tracking-tight text-gray-900">
                    {b.name}
                  </p>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">
                  {b.featured ? "Featured" : "Brand"}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-accent font-medium">
                  Shop →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
