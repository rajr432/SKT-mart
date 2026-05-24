const ITEMS = [
  { name: "Priya S.", city: "Mumbai", text: "Fast delivery and genuine products. Got my order in 2 days!", rating: 5 },
  { name: "Rahul K.", city: "Delhi", text: "Best prices I've found online. Customer support is amazing.", rating: 5 },
  { name: "Anita M.", city: "Bangalore", text: "Easy returns, wallet credit super quick. Will order again.", rating: 5 },
  { name: "Vikram P.", city: "Pune", text: "Flash deals are 🔥. Got 70% off on trendy shirt!", rating: 4 },
];

export default function Testimonials() {
  return (
    <section className="container-page mt-6">
      <h2 className="text-xl font-semibold mb-3">What our customers say</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {ITEMS.map((t, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                {t.name[0]}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-[10px] text-gray-500">{t.city}</div>
              </div>
              <div className="ml-auto text-xs text-yellow-500">
                {"★".repeat(t.rating)}
              </div>
            </div>
            <p className="text-sm text-gray-700 italic">&ldquo;{t.text}&rdquo;</p>
          </div>
        ))}
      </div>
    </section>
  );
}
