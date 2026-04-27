"use client";

import { useEffect, useRef, useState } from "react";

// Cosmetic multi-currency hint. Prices on the storefront are quoted in INR
// (paise) and remain unchanged — checkout / Razorpay always charges in INR.
// This widget lets visitors get a quick approximate conversion without
// leaving the page. Rates are static (updated periodically) — kept inline
// to avoid an extra network call on every page load.
const RATES: Array<{ code: string; flag: string; rate: number; symbol: string }> = [
  { code: "INR", flag: "🇮🇳", rate: 1, symbol: "₹" },
  { code: "USD", flag: "🇺🇸", rate: 0.012, symbol: "$" },
  { code: "EUR", flag: "🇪🇺", rate: 0.011, symbol: "€" },
  { code: "GBP", flag: "🇬🇧", rate: 0.0094, symbol: "£" },
  { code: "AED", flag: "🇦🇪", rate: 0.044, symbol: "د.إ" },
  { code: "SAR", flag: "🇸🇦", rate: 0.045, symbol: "﷼" },
  { code: "AUD", flag: "🇦🇺", rate: 0.018, symbol: "A$" },
  { code: "CAD", flag: "🇨🇦", rate: 0.016, symbol: "C$" },
];

const STORAGE_KEY = "skt-currency";

export default function CurrencyMenu() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string>("INR");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCode(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = RATES.find((r) => r.code === code) ?? RATES[0];

  const select = (next: string) => {
    setCode(next);
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("skt-currency-change", { detail: next }));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium px-2 py-1 rounded hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Currency display (cosmetic)"
      >
        {current.flag} {current.code}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-gray-500 border-b">
            Approximate display (₹1 ≈ ...). Checkout always in INR.
          </div>
          <ul className="max-h-64 overflow-auto">
            {RATES.map((r) => (
              <li key={r.code}>
                <button
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    r.code === code ? "bg-blue-50 text-brand font-semibold" : ""
                  }`}
                  onClick={() => select(r.code)}
                >
                  <span className="text-base">{r.flag}</span>
                  <span className="flex-1">{r.code}</span>
                  <span className="text-xs text-gray-500">
                    {r.code === "INR" ? "—" : `${r.symbol}${r.rate.toFixed(4)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
