"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SLIDES = [
  {
    tag: "Flash Sale",
    title: "Upto 80% OFF",
    subtitle: "Electronics, Mobiles & Laptops",
    cta: "Shop Now",
    href: "/category/electronics",
    grad: "from-[#2874f0] via-[#7b4bff] to-[#ff6b6b]",
  },
  {
    tag: "New Arrivals",
    title: "Fashion Week",
    subtitle: "Trending styles from top brands",
    cta: "Explore",
    href: "/category/fashion",
    grad: "from-[#ff9500] via-[#ffd814] to-[#ff4d8d]",
  },
  {
    tag: "Big Saver",
    title: "Home Makeover",
    subtitle: "Furniture, Kitchen & Appliances",
    cta: "Browse",
    href: "/category/home-kitchen",
    grad: "from-[#16a34a] via-[#22d3ee] to-[#2874f0]",
  },
];

export default function Hero3D() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[idx];

  return (
    <section
      className={`hero-3d relative overflow-hidden rounded-xl bg-gradient-to-br ${s.grad} text-white transition-[background] duration-700`}
    >
      <div className="container-page relative py-6 sm:py-16 grid sm:grid-cols-[1.3fr_1fr] items-center gap-6">
        <div className="tilt-in space-y-4 relative z-10">
          <span className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase">
            {s.tag}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight shine-text drop-shadow">
            {s.title}
          </h1>
          <p className="text-white/90 text-sm sm:text-lg max-w-md">{s.subtitle}</p>
          <div className="flex gap-3 pt-2">
            <Link
              href={s.href}
              className="pulse-glow bg-brand-yellow text-gray-900 font-bold px-6 py-3 rounded-full hover:scale-105 transition"
            >
              {s.cta} →
            </Link>
            <Link
              href="/search"
              className="bg-white/10 backdrop-blur border border-white/30 px-6 py-3 rounded-full hover:bg-white/20 transition"
            >
              All Deals
            </Link>
          </div>
          <div className="flex gap-2 pt-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-8 bg-white" : "w-3 bg-white/40"
                }`}
                aria-label={`slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 3D floating cube — hidden on phones for faster paint + cleaner UI */}
        <div className="relative h-48 sm:h-72 hidden sm:flex items-center justify-center">
          <div className="hero-cube relative w-36 h-36 sm:w-48 sm:h-48">
            {/* 6 faces of a cube */}
            {[
              { t: "translateZ(96px)" },
              { t: "rotateY(180deg) translateZ(96px)" },
              { t: "rotateY(90deg) translateZ(96px)" },
              { t: "rotateY(-90deg) translateZ(96px)" },
              { t: "rotateX(90deg) translateZ(96px)" },
              { t: "rotateX(-90deg) translateZ(96px)" },
            ].map((f, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-2xl bg-white/95 flex items-center justify-center shadow-2xl"
                style={{ transform: f.t, backfaceVisibility: "hidden" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpg"
                  alt="SKT Mart"
                  className="w-3/4 h-3/4 object-contain rounded-xl"
                />
              </div>
            ))}
          </div>
          {/* orbit ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="spin-slow w-60 h-60 sm:w-80 sm:h-80 rounded-full border-2 border-dashed border-white/30" />
          </div>
        </div>
      </div>
      {/* decorative blobs */}
      <div className="absolute -top-20 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-10 w-72 h-72 bg-black/10 rounded-full blur-3xl" />
    </section>
  );
}
