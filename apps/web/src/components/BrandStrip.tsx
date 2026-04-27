type Brand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  featured: boolean;
};

async function fetchBrands(): Promise<Brand[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const res = await fetch(`${base}/api/brands`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Brand[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function BrandStrip() {
  const brands = await fetchBrands();
  if (brands.length === 0) return null;
  // Duplicate the list so the marquee animation can loop seamlessly.
  const doubled = [...brands, ...brands];
  return (
    <div className="card overflow-hidden py-4">
      <div className="flex items-center gap-3 px-4 mb-2">
        <span className="text-2xl">🏷️</span>
        <h3 className="font-semibold">Top Brands</h3>
      </div>
      <div className="relative overflow-hidden">
        <div className="marquee-track flex gap-6 whitespace-nowrap w-max">
          {doubled.map((b, i) => (
            <a
              key={`${b.id}-${i}`}
              href={`/search?brand=${encodeURIComponent(b.name)}`}
              className="tilt-card bg-gradient-to-br from-gray-50 to-white border border-gray-200 px-6 py-3 rounded-lg text-sm font-bold text-gray-700 shrink-0 flex items-center gap-2 hover:border-brand hover:text-brand"
            >
              {b.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logo}
                  alt={b.name}
                  className="h-6 w-6 object-contain"
                />
              ) : null}
              {b.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
