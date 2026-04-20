import Link from "next/link";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  mobiles: "📱",
  fashion: "👗",
  electronics: "💻",
  "home-kitchen": "🏠",
  beauty: "💄",
  books: "📚",
  sports: "⚽",
  grocery: "🛒",
  toys: "🧸",
  appliances: "🔌",
  automotive: "🚗",
};

const PALETTE = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-purple-500 to-fuchsia-600",
  "from-green-500 to-emerald-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-red-500 to-pink-600",
  "from-teal-500 to-cyan-600",
];

export default async function CategoriesPage() {
  const { items } = await api<{ items: Category[] }>("/api/categories").catch(() => ({
    items: [] as Category[],
  }));

  return (
    <div className="container-page py-6 space-y-4">
      <section className="card p-6 bg-gradient-to-br from-brand via-blue-700 to-indigo-700 text-white">
        <h1 className="text-3xl font-extrabold">All Categories</h1>
        <p className="opacity-90 mt-1">
          Explore {items.length} categories. Find exactly what you&apos;re looking for.
        </p>
      </section>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-600">
          No categories yet. Admin can add them from{" "}
          <Link href="/admin" className="text-brand underline">
            Admin → Categories
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((c, i) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={`tilt-card card p-5 text-white bg-gradient-to-br ${
                PALETTE[i % PALETTE.length]
              } tilt-in`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="text-4xl mb-2">{ICONS[c.slug] ?? "🛍"}</div>
              <div className="text-lg font-bold">{c.name}</div>
              {c.children && c.children.length > 0 && (
                <div className="text-xs opacity-80 mt-1">
                  {c.children.length} sub-categor{c.children.length === 1 ? "y" : "ies"}
                </div>
              )}
              <div className="text-xs mt-3 underline underline-offset-2">Shop now →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
