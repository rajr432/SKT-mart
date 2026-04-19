"use client";

import { useEffect, useState } from "react";

const BANNERS = [
  { id: "diwali", emoji: "🪔", title: "Diwali Mega Sale", sub: "Up to 80% off · Free shipping", bg: "from-orange-500 via-red-500 to-yellow-500" },
  { id: "republic", emoji: "🇮🇳", title: "Republic Day Sale", sub: "Tricolor deals · Bank offers", bg: "from-orange-400 via-white to-green-500 text-gray-900" },
  { id: "summer", emoji: "☀️", title: "Summer Cool Sale", sub: "Beat the heat — 50% off cooling", bg: "from-sky-400 via-cyan-400 to-blue-500" },
  { id: "monsoon", emoji: "🌧️", title: "Monsoon Magic", sub: "Raincoats & umbrellas 60% off", bg: "from-slate-500 via-blue-600 to-indigo-700" },
];

export default function FestivalBanner() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // Pick banner by month so it feels "live" without an admin CMS;
    // still rotates to keep homepage lively on repeat visits.
    const month = new Date().getMonth();
    const pick = month === 9 || month === 10 ? 0 : month === 0 ? 1 : month >= 2 && month <= 5 ? 2 : 3;
    setIdx(pick);
  }, []);
  const b = BANNERS[idx];
  return (
    <div className={`card p-4 md:p-5 bg-gradient-to-r ${b.bg} text-white relative overflow-hidden`}>
      <div className="absolute -top-8 -right-8 text-[160px] opacity-20 select-none">{b.emoji}</div>
      <div className="relative">
        <div className="text-xs font-semibold opacity-90 uppercase tracking-wider">Limited time</div>
        <h2 className="text-2xl md:text-3xl font-extrabold mt-1 drop-shadow">{b.emoji} {b.title}</h2>
        <p className="text-sm md:text-base opacity-95">{b.sub}</p>
      </div>
    </div>
  );
}
