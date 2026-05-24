"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SLIDES = [
  {
    tag: "Limited Edition",
    title: "Curated for You",
    subtitle: "Premium electronics, fashion & lifestyle — handpicked.",
    cta: "Shop Now",
    href: "/category/electronics",
    grad: "from-violet-100 via-fuchsia-50 to-rose-100",
    accent: "text-accent-dark",
  },
  {
    tag: "New Season",
    title: "Fashion Edit '25",
    subtitle: "Trending silhouettes from top designers.",
    cta: "Explore",
    href: "/category/fashion",
    grad: "from-amber-50 via-rose-50 to-pink-100",
    accent: "text-rose-700",
  },
  {
    tag: "Home & Living",
    title: "Refined Spaces",
    subtitle: "Minimalist furniture, smart kitchen & decor.",
    cta: "Browse",
    href: "/category/home-kitchen",
    grad: "from-emerald-50 via-teal-50 to-cyan-100",
    accent: "text-emerald-700",
  },
];

export default function Hero3D() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[idx];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${s.grad} transition-[background] duration-1000`}
    >
      <div className="container-page relative py-10 sm:py-16 grid sm:grid-cols-[1.2fr_1fr] items-center gap-6">
        <div className="space-y-4 relative z-10 fade-up">
          <span className={`inline-block bg-white/70 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase ${s.accent}`}>
            {s.tag}
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-[1.1] text-ink tracking-tight">
            {s.title}
          </h1>
          <p className="text-ink-soft text-sm sm:text-base max-w-md">{s.subtitle}</p>
          <div className="flex gap-3 pt-2">
            <Link
              href={s.href}
              className="btn-pill bg-ink text-white text-sm hover:bg-accent-dark"
            >
              {s.cta} →
            </Link>
            <Link
              href="/search"
              className="btn-pill bg-white/80 border border-gray-200 text-ink text-sm hover:bg-white"
            >
              All Deals
            </Link>
          </div>
          <div className="flex gap-2 pt-3">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? "w-10 bg-ink" : "w-3 bg-ink/20"
                }`}
                aria-label={`slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Decorative floating shape — minimalist, no logo cube */}
        <div className="relative h-48 sm:h-72 hidden sm:flex items-center justify-center">
          <div className="absolute h-56 w-56 rounded-full bg-white/40 backdrop-blur-2xl border border-white/60" />
          <div className="absolute h-72 w-72 rounded-full border border-white/40" />
          <div className="absolute right-8 top-8 h-20 w-20 rounded-3xl bg-accent/10 backdrop-blur-sm border border-accent/20 rotate-12" />
          <div className="absolute left-4 bottom-6 h-14 w-14 rounded-full bg-pink-300/30 backdrop-blur-sm border border-pink-300/40" />
        </div>
      </div>
    </section>
  );
}
