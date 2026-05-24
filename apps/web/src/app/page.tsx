import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Hero3D from "@/components/Hero3D";
import FlashDealTimer from "@/components/FlashDealTimer";
import FlashSalesStrip from "@/components/FlashSalesStrip";
import BrandStrip from "@/components/BrandStrip";
import Testimonials from "@/components/Testimonials";
import NewsletterSignup from "@/components/NewsletterSignup";
import RecentlyViewed from "@/components/RecentlyViewed";
import HomepageCollections from "@/components/HomepageCollections";
import FestivalBanner from "@/components/FestivalBanner";
import CouponCopyStrip from "@/components/CouponCopyStrip";
import { api, discountPercent } from "@/lib/api";
import type { Banner, Category, Product } from "@/lib/types";

import { getPageSeo } from "@/lib/seo";

// Homepage is the most-cached surface — 5 min ISR. Admin changes (banners,
// flash sales, hero copy) appear within 5 min without a redeploy.
export const revalidate = 300;

export async function generateMetadata() {
  return await getPageSeo("home");
}

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

      {/* Admin-scheduled flash sales (time-bound) */}
      <FlashSalesStrip />

      {/* Story Circles — Instagram-style category rail */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Shop by Category</h2>
          <Link href="/categories" className="text-xs font-semibold text-accent hover:text-accent-dark">
            View all →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {categories.slice(0, 16).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-2 min-w-[76px] group"
            >
              <div className="story-ring transition-transform group-hover:scale-105">
                <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full bg-white p-0.5">
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center text-2xl overflow-hidden">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image}
                        alt={c.name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <span aria-hidden>{CAT_EMOJI[c.slug] ?? c.name[0]}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-ink text-center line-clamp-1 max-w-[78px] group-hover:text-accent transition">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Promo tiles — minimal premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/account/wallet" className="rounded-3xl p-5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white transition-transform hover:scale-[1.02]">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">Wallet</div>
          <div className="font-bold text-lg mt-2">Instant refunds</div>
          <div className="text-xs opacity-80 mt-3">Manage balance →</div>
        </Link>
        <Link href="/account/loyalty" className="rounded-3xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white transition-transform hover:scale-[1.02]">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">SKT Coins</div>
          <div className="font-bold text-lg mt-2">Earn rewards</div>
          <div className="text-xs opacity-80 mt-3">1 coin / ₹100 →</div>
        </Link>
        <Link href="/account/referral" className="rounded-3xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition-transform hover:scale-[1.02]">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">Refer &amp; Earn</div>
          <div className="font-bold text-lg mt-2">₹100 per friend</div>
          <div className="text-xs opacity-80 mt-3">Share now →</div>
        </Link>
        <Link href="/account/giftcards" className="rounded-3xl p-5 bg-gradient-to-br from-pink-500 to-rose-600 text-white transition-transform hover:scale-[1.02]">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">Gift Cards</div>
          <div className="font-bold text-lg mt-2">Buy &amp; redeem</div>
          <div className="text-xs opacity-80 mt-3">Explore →</div>
        </Link>
      </div>

      {banners[0] && (
        <Link
          href={banners[0].link ?? "#"}
          className="block rounded-3xl overflow-hidden bg-gray-50 transition-transform hover:scale-[1.005]"
        >
          {/* Full-image banner — admin upload pe jitni image utna show, koi crop nahi */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banners[0].image}
            alt={banners[0].title}
            className="w-full h-auto block"
            // First banner is above-the-fold — tell the browser to fetch it
            // eagerly + at high priority so LCP paints fast on cold loads.
            loading="eager"
            // @ts-expect-error fetchpriority is a valid HTML attribute, missing in current React types
            fetchpriority="high"
            decoding="async"
          />
        </Link>
      )}

      {/* Flash deals with countdown */}
      <section className="card-premium p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-accent/10 to-pink-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4 relative">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-accent to-pink-500 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
            </span>
            <h2 className="text-xl font-bold text-ink">Flash Deals</h2>
            <FlashDealTimer />
          </div>
          <Link href="/search?sort=discount" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View All →
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
      <section className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink">Best Deals <span className="text-xs font-medium text-ink-muted ml-1">20%+ OFF</span></h2>
          <Link href="/search?sort=discount" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View All →
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
            <Link key={b.id} href={b.link ?? "#"} className="block rounded-3xl overflow-hidden bg-gray-50 transition-transform hover:scale-[1.005]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title} className="w-full h-auto block" />
            </Link>
          ))}
        </div>
      )}

      {/* Top Rated */}
      <section className="card-premium p-5">
        <h2 className="text-xl font-bold text-ink mb-4">Top Rated</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {topRated.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="rounded-3xl p-6 bg-gradient-to-br from-violet-50 via-white to-rose-50 border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, title: "Free Delivery", sub: "On orders ₹500+" },
            { svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>, title: "Easy Returns", sub: "7-day hassle-free" },
            { svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: "Secure Payments", sub: "Razorpay · UPI · Card" },
            { svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, title: "24×7 Support", sub: "Call or email us" },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-10 w-10 rounded-full glass grid place-items-center text-accent mb-2">{f.svg}</div>
              <div className="font-semibold text-sm text-ink">{f.title}</div>
              <div className="text-xs text-ink-muted mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* All products — Best Sellers */}
      <section className="card-premium p-5">
        <h2 className="text-xl font-bold text-ink mb-4">Best Sellers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.slice(0, 20).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Admin-curated homepage collections (editable via /admin/site-content) */}
      <HomepageCollections />

      {/* Recently viewed — personalised when logged in */}
      <RecentlyViewed />

      {/* Testimonials */}
      <Testimonials />

      {/* Newsletter signup */}
      <NewsletterSignup />
    </div>
  );
}
