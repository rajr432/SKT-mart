import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Hero3D from "@/components/Hero3D";
import FlashDealTimer from "@/components/FlashDealTimer";
import BrandStrip from "@/components/BrandStrip";
import Testimonials from "@/components/Testimonials";
import NewsletterSignup from "@/components/NewsletterSignup";
import RecentlyViewed from "@/components/RecentlyViewed";
import FestivalBanner from "@/components/FestivalBanner";
import CouponCopyStrip from "@/components/CouponCopyStrip";
import { api, discountPercent } from "@/lib/api";
import type { Banner, Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAT_EMOJI: Record<string, string> = {
  electronics: "📱",
  mobiles: "📱",
  laptops: "💻",
  audio: "🎧",
  fashion: "👗",
  "men-fashion": "👔",
  "women-fashion": "👚",
  "home-kitchen": "🏠",
  kitchen: "🍳",
  books: "📚",
  sports: "⚽",
  beauty: "💄",
  grocery: "🛒",
  toys: "🎮",
};

export default async function HomePage() {
  const [{ items: banners }, { items: categories }, { items: products }] = await Promise.all([
    api<{ items: Banner[] }>("/api/banners").catch(() => ({ items: [] })),
    api<{ items: Category[] }>("/api/categories").catch(() => ({ items: [] })),
    api<{ items: Product[]; total: number }>("/api/products?limit=24").catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  const topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const bestDeals = [...products]
    .filter((p) => discountPercent(p.mrp, p.price) >= 20)
    .slice(0, 10);
  const flashDeals = [...products]
    .sort((a, b) => discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price))
    .slice(0, 8);

  return (
    <div className="container-page py-4 space-y-4">
      {/* Seasonal festival banner */}
      <FestivalBanner />

      {/* 3D animated hero carousel */}
      <Hero3D />

      {/* Category rail with 3D tilt */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="text-xl">🧭</span> Shop by Category
          </h2>
          <Link href="/search" className="text-sm text-brand">
            All
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
          {categories.slice(0, 14).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="tilt-card flex flex-col items-center gap-1 min-w-[88px] p-2 rounded-lg hover:text-brand"
            >
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 via-yellow-50 to-pink-50 border border-gray-200 flex items-center justify-center text-3xl shadow-sm">
                {CAT_EMOJI[c.slug] ?? c.name[0]}
              </div>
              <span className="text-xs font-medium text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Promo tiles — Wallet, Loyalty, Referral, Gift Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/account/wallet" className="tilt-card card p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="text-2xl">💳</div>
          <div className="font-bold mt-2">Wallet</div>
          <div className="text-xs opacity-90">Instant refunds</div>
        </Link>
        <Link href="/account/loyalty" className="tilt-card card p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="text-2xl">🪙</div>
          <div className="font-bold mt-2">SKT Coins</div>
          <div className="text-xs opacity-90">1 coin / ₹100</div>
        </Link>
        <Link href="/account/referral" className="tilt-card card p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <div className="text-2xl">🎁</div>
          <div className="font-bold mt-2">Refer & Earn</div>
          <div className="text-xs opacity-90">₹100 per friend</div>
        </Link>
        <Link href="/account/giftcards" className="tilt-card card p-4 bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <div className="text-2xl">💝</div>
          <div className="font-bold mt-2">Gift Cards</div>
          <div className="text-xs opacity-90">Buy & redeem</div>
        </Link>
      </div>

      {banners[0] && (
        <Link href={banners[0].link ?? "#"} className="block card overflow-hidden tilt-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banners[0].image}
            alt={banners[0].title}
            className="w-full h-44 sm:h-64 object-cover"
          />
        </Link>
      )}

      {/* Flash deals with countdown */}
      <section className="card p-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-100 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3 relative">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">⚡</span>
            <h2 className="text-xl font-bold">Flash Deals</h2>
            <FlashDealTimer />
          </div>
          <Link href="/search?sort=discount" className="text-sm text-brand">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 relative">
          {flashDeals.slice(0, 8).map((p, i) => (
            <div key={p.id} className="tilt-in" style={{ animationDelay: `${i * 60}ms` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Copy coupon codes */}
      <CouponCopyStrip />

      {/* Top brands marquee */}
      <BrandStrip />

      {/* Best Deals */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>🔥</span> Best Deals (20%+ OFF)
          </h2>
          <Link href="/search?sort=discount" className="text-sm text-brand">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {bestDeals.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {banners[1] && (
        <div className="grid sm:grid-cols-2 gap-4">
          {banners.slice(1, 3).map((b) => (
            <Link key={b.id} href={b.link ?? "#"} className="card overflow-hidden tilt-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title} className="w-full h-40 object-cover" />
            </Link>
          ))}
        </div>
      )}

      {/* Top Rated */}
      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span>⭐</span> Top Rated
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {topRated.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="card p-4 bg-gradient-to-r from-blue-50 via-white to-yellow-50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { icon: "🚚", title: "Free Delivery", sub: "On orders ₹500+" },
            { icon: "🔁", title: "Easy Returns", sub: "7-day hassle-free" },
            { icon: "🔒", title: "Secure Payments", sub: "Razorpay · UPI · Card" },
            { icon: "💬", title: "24×7 Support", sub: "Call or email us" },
          ].map((f, i) => (
            <div key={i} className="tilt-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-3xl">{f.icon}</div>
              <div className="font-semibold text-sm mt-1">{f.title}</div>
              <div className="text-xs text-gray-500">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* All products — Best Sellers */}
      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span>🏆</span> Best Sellers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.slice(0, 20).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Recently viewed — personalised when logged in */}
      <RecentlyViewed />

      {/* Testimonials */}
      <Testimonials />

      {/* Newsletter signup */}
      <NewsletterSignup />
    </div>
  );
}
