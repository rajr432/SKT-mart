import Link from "next/link";

const BRANDS = [
  { name: "Samsung", tag: "Electronics", color: "from-blue-500 to-indigo-600" },
  { name: "Apple", tag: "Premium", color: "from-gray-700 to-gray-900" },
  { name: "OnePlus", tag: "Mobiles", color: "from-red-500 to-rose-600" },
  { name: "Xiaomi", tag: "Value", color: "from-orange-500 to-amber-600" },
  { name: "Sony", tag: "Audio", color: "from-neutral-800 to-neutral-950" },
  { name: "Realme", tag: "Smartphones", color: "from-yellow-500 to-orange-500" },
  { name: "Boat", tag: "Audio", color: "from-red-600 to-pink-600" },
  { name: "JBL", tag: "Audio", color: "from-orange-600 to-red-600" },
  { name: "Nike", tag: "Fashion", color: "from-black to-gray-700" },
  { name: "Puma", tag: "Fashion", color: "from-red-500 to-yellow-500" },
  { name: "Adidas", tag: "Fashion", color: "from-gray-800 to-black" },
  { name: "Levi's", tag: "Apparel", color: "from-red-600 to-red-800" },
  { name: "Philips", tag: "Home", color: "from-sky-500 to-blue-600" },
  { name: "HP", tag: "Laptops", color: "from-blue-600 to-cyan-600" },
  { name: "Dell", tag: "Laptops", color: "from-blue-700 to-indigo-700" },
  { name: "Lenovo", tag: "Laptops", color: "from-red-600 to-rose-700" },
  { name: "LG", tag: "Appliances", color: "from-pink-600 to-fuchsia-600" },
  { name: "Asus", tag: "Gaming", color: "from-cyan-500 to-blue-600" },
  { name: "Canon", tag: "Cameras", color: "from-red-700 to-red-900" },
  { name: "Nikon", tag: "Cameras", color: "from-yellow-500 to-amber-600" },
];

export default function BrandsPage() {
  return (
    <div className="container-page py-6 space-y-4">
      <section className="card p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
        <h1 className="text-3xl font-extrabold">Top Brands</h1>
        <p className="opacity-90 mt-1">Shop from the world&apos;s most-loved brands, all in one place.</p>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {BRANDS.map((b, i) => (
          <Link
            key={b.name}
            href={`/search?q=${encodeURIComponent(b.name)}`}
            className={`tilt-card card p-5 text-white bg-gradient-to-br ${b.color} tilt-in`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="text-xl font-bold">{b.name}</div>
            <div className="text-xs opacity-80 mt-1">{b.tag}</div>
            <div className="text-xs mt-3 underline underline-offset-2">Shop now →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
