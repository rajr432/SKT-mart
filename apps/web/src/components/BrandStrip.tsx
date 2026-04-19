const BRANDS = [
  "Samsung",
  "Apple",
  "OnePlus",
  "Xiaomi",
  "Sony",
  "Realme",
  "Boat",
  "JBL",
  "Nike",
  "Puma",
  "Adidas",
  "Levi's",
  "Philips",
  "HP",
  "Dell",
  "Lenovo",
  "LG",
  "Asus",
  "Canon",
  "Nikon",
];

export default function BrandStrip() {
  const doubled = [...BRANDS, ...BRANDS];
  return (
    <div className="card overflow-hidden py-4">
      <div className="flex items-center gap-3 px-4 mb-2">
        <span className="text-2xl">🏷️</span>
        <h3 className="font-semibold">Top Brands</h3>
      </div>
      <div className="relative overflow-hidden">
        <div className="marquee-track flex gap-6 whitespace-nowrap w-max">
          {doubled.map((b, i) => (
            <div
              key={i}
              className="tilt-card bg-gradient-to-br from-gray-50 to-white border border-gray-200 px-6 py-3 rounded-lg text-sm font-bold text-gray-700 shrink-0"
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
