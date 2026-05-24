"use client";

import { useEffect, useState } from "react";

function endOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function FlashDealTimer() {
  const [target] = useState(() => endOfDay());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono">
      <span className="bg-red-600 text-white px-2 py-1 rounded">{pad(h)}</span>
      <span className="text-red-600 font-bold">:</span>
      <span className="bg-red-600 text-white px-2 py-1 rounded">{pad(m)}</span>
      <span className="text-red-600 font-bold">:</span>
      <span className="bg-red-600 text-white px-2 py-1 rounded">{pad(s)}</span>
    </div>
  );
}
