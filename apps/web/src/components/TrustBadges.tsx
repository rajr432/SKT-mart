const BADGES = [
  { icon: "🔒", title: "Secure payment", sub: "Razorpay · UPI · Cards" },
  { icon: "↩️", title: "7-day returns", sub: "No questions asked" },
  { icon: "✅", title: "100% authentic", sub: "Verified sellers only" },
  { icon: "🚚", title: "Fast delivery", sub: "Free over ₹499" },
];

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t">
      {BADGES.map((b) => (
        <div
          key={b.title}
          className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1.5"
        >
          <span className="text-lg">{b.icon}</span>
          <div>
            <div className="font-semibold text-gray-800">{b.title}</div>
            <div className="text-gray-500 text-[10px]">{b.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
