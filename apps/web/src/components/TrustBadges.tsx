// Static trust signals shown on PDP + checkout to reduce cart abandonment.
// Intentionally inline SVGs so no extra network round-trips.
export default function TrustBadges() {
  const items = [
    {
      title: "Secure payments",
      desc: "Razorpay encrypted checkout",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        </svg>
      ),
    },
    {
      title: "Free 7-day returns",
      desc: "No-questions-asked exchange",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 12a9 9 0 0118 0M21 12a9 9 0 01-18 0M15 7l-3-3-3 3M9 17l3 3 3-3" />
        </svg>
      ),
    },
    {
      title: "100% authentic",
      desc: "Sourced direct from brands",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
    },
    {
      title: "India-wide delivery",
      desc: "29 states · 18000+ pincodes",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 7h13l5 5v5h-3M3 7v10h3m12 0a2 2 0 11-4 0 2 2 0 014 0zm-12 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((i) => (
        <div key={i.title} className="card p-3 flex items-start gap-2">
          <div className="text-brand-blue mt-0.5">{i.icon}</div>
          <div>
            <p className="text-xs font-semibold">{i.title}</p>
            <p className="text-[10px] text-gray-500 leading-snug">{i.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
