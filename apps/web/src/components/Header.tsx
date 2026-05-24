"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";
import MobileDrawer from "./MobileDrawer";
import VoiceSearch from "./VoiceSearch";
import DarkModeToggle from "./DarkModeToggle";
import CurrencyMenu from "./CurrencyMenu";

export default function Header() {
  const { user, token, logout } = useAuth();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [phIdx, setPhIdx] = useState(0);
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);

  const PLACEHOLDERS = [
    "Search for 'Sneakers'",
    "Search for 'Latest Kurta'",
    "Search for 'iPhone 15'",
    "Search for 'Wireless Earbuds'",
    "Search for 'Lipstick'",
    "Search for 'Smart Watch'",
    "Search for 'Backpack'",
  ];

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 2800);
    return () => clearInterval(t);
  }, [PLACEHOLDERS.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skt_recent_searches");
      if (raw) setRecent(JSON.parse(raw).slice(0, 6));
    } catch {
      /* */
    }
  }, []);

  const saveRecent = (term: string) => {
    try {
      const raw = localStorage.getItem("skt_recent_searches");
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const next = [term, ...arr.filter((t) => t !== term)].slice(0, 8);
      localStorage.setItem("skt_recent_searches", JSON.stringify(next));
      setRecent(next.slice(0, 6));
    } catch {
      /* */
    }
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem("skt_recent_searches");
      setRecent([]);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const { items } = await api<{ items: Array<{ id: string; name: string; slug: string }> }>(
          `/api/search/suggest?q=${encodeURIComponent(q)}`,
        );
        setSuggestions(items);
        setOpen(true);
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    if (!token) {
      setNotifCount(0);
      setCartCount(0);
      return;
    }
    Promise.all([
      api<{ items: Array<{ read: boolean }> }>("/api/notifications", { token }).catch(() => ({
        items: [],
      })),
      api<{ items: Array<unknown> }>("/api/cart", { token }).catch(() => ({ items: [] })),
    ]).then(([n, c]) => {
      setNotifCount(n.items.filter((i) => !i.read).length);
      setCartCount(c.items.length);
    });
  }, [token]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    saveRecent(term);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="bg-white/80 glass border-b border-gray-100 text-ink sticky top-0 z-40">
      <div className="container-page flex items-center gap-2 py-2.5">
        <MobileDrawer />
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="SKT Mart home">
          <span className="rounded-xl p-1 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="SKT Mart" className="h-8 w-auto rounded-lg" />
          </span>
          <span className="hidden md:inline text-[11px] font-medium text-ink-muted leading-tight tracking-wide">
            Shop Smart,<br />Live Better
          </span>
        </Link>

        <form onSubmit={submit} className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center bg-gray-100/80 hover:bg-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/30 rounded-full transition-all border border-transparent focus-within:border-accent/40">
            <span className="pl-4 text-ink-muted" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => (suggestions.length > 0 || recent.length > 0) && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              placeholder={PLACEHOLDERS[phIdx]}
              className="flex-1 bg-transparent text-ink text-sm px-3 py-2 focus:outline-none placeholder:text-ink-muted placeholder:transition-opacity"
            />
            <div className="flex items-center pr-1">
              <VoiceSearch />
              <button
                type="submit"
                className="h-8 w-8 grid place-items-center rounded-full bg-accent text-white hover:bg-accent-dark transition"
                aria-label="search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
          {open && (suggestions.length > 0 || (q.trim().length < 2 && recent.length > 0)) && (
            <div className="absolute top-full left-0 right-0 bg-white text-ink shadow-2xl mt-2 z-50 max-h-80 overflow-auto rounded-2xl border border-gray-100">
              {q.trim().length < 2 && recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase text-gray-500 bg-gray-50 border-b">
                    <span>Recently searched</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={clearRecent}
                      className="text-brand hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        saveRecent(t);
                        setOpen(false);
                        router.push(`/search?q=${encodeURIComponent(t)}`);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-sm text-left"
                    >
                      <span className="text-gray-400">⏱️</span>
                      <span className="flex-1">{t}</span>
                    </button>
                  ))}
                </div>
              )}
              {suggestions.length > 0 && (
                <div>
                  {q.trim().length >= 2 && (
                    <div className="px-3 py-1.5 text-[11px] uppercase text-gray-500 bg-gray-50 border-b">Products</div>
                  )}
                  {suggestions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/product/${s.slug}`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                      onMouseDown={() => saveRecent(s.name)}
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-gray-400">🔍</span>
                      <span className="flex-1">{s.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <CurrencyMenu />
          <DarkModeToggle />
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-1.5">
                <span className="bg-brand-yellow text-brand rounded-full w-7 h-7 grid place-items-center font-bold text-xs">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[90px] truncate">{user.name.split(" ")[0]}</span>
                <span>▾</span>
              </button>
              <div className="absolute right-0 top-full pt-1 hidden group-hover:block">
                <div className="bg-white text-gray-900 shadow-lg rounded-sm min-w-[220px] overflow-hidden">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b bg-gray-50">
                    Signed in as <span className="font-semibold text-gray-900">{user.name}</span>
                  </div>
                  <Link href="/account" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    👤 My Account
                  </Link>
                  <Link href="/orders" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    📦 My Orders
                  </Link>
                  <Link href="/wishlist" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    ♥ Wishlist
                  </Link>
                  <Link
                    href="/account/wallet"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    💰 SKT Wallet
                  </Link>
                  <Link
                    href="/account/loyalty"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🪙 SKT Coins
                  </Link>
                  <Link
                    href="/account/giftcards"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🎁 Gift Cards
                  </Link>
                  <Link
                    href="/account/referral"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🤝 Refer &amp; Earn
                  </Link>
                  <Link
                    href="/account/notifications"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🔔 Notifications {notifCount > 0 && `(${notifCount})`}
                  </Link>
                  <Link href="/account/returns" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    ↩ Returns
                  </Link>
                  <Link href="/account/reviews" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    ★ My Reviews
                  </Link>
                  <Link href="/account/coupons" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    🏷 My Coupons
                  </Link>
                  <div className="border-t my-1" />
                  {user.role === "VENDOR" && (
                    <Link href="/vendor" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                      🏪 Vendor Dashboard
                    </Link>
                  )}
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                      🛡 Admin Panel
                    </Link>
                  )}
                  {user.role === "CUSTOMER" && (
                    <Link
                      href="/vendor/onboarding"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      💼 Become a Seller
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                  >
                    ⎋ Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-pill bg-accent text-white text-sm hover:bg-accent-dark"
            >
              Login
            </Link>
          )}

          <Link href="/account/notifications" className="relative" aria-label="notifications">
            🔔
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 grid place-items-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          <Link href="/wishlist" aria-label="wishlist" className="hover:text-brand-yellow">
            ♥
          </Link>

          <Link href="/deals" className="hover:underline hidden lg:inline">
            🔥 Deals
          </Link>
          <Link href="/brands" className="hover:underline hidden lg:inline">
            Brands
          </Link>
          <Link href="/vendor/onboarding" className="hover:underline hidden lg:inline">
            Become Seller
          </Link>

          <Link href="/cart" className="relative flex items-center gap-1">
            🛒 <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-brand-yellow text-brand text-[10px] rounded-full w-4 h-4 grid place-items-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile-only compact icons */}
        <nav className="flex md:hidden items-center gap-3 text-lg">
          <Link href="/account/notifications" className="relative" aria-label="notifications">
            🔔
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center font-bold">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>
          <Link href="/cart" className="relative" aria-label="cart">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-brand-yellow text-brand text-[10px] rounded-full w-4 h-4 grid place-items-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Secondary nav strip — category shortcuts */}
      <div className="bg-white text-gray-700 border-b border-gray-200 hidden md:block">
        <div className="container-page flex items-center gap-6 py-1.5 text-xs overflow-x-auto no-scrollbar">
          <Link href="/category/electronics" className="hover:text-brand whitespace-nowrap">
            Electronics
          </Link>
          <Link href="/category/fashion" className="hover:text-brand whitespace-nowrap">
            Fashion
          </Link>
          <Link href="/category/home-kitchen" className="hover:text-brand whitespace-nowrap">
            Home &amp; Kitchen
          </Link>
          <Link href="/category/beauty" className="hover:text-brand whitespace-nowrap">
            Beauty
          </Link>
          <Link href="/category/books" className="hover:text-brand whitespace-nowrap">
            Books
          </Link>
          <Link href="/category/sports" className="hover:text-brand whitespace-nowrap">
            Sports
          </Link>
          <Link href="/category/mobiles" className="hover:text-brand whitespace-nowrap">
            Mobiles
          </Link>
          <Link href="/deals" className="hover:text-brand whitespace-nowrap text-red-600 font-semibold">
            🔥 Today&apos;s Deals
          </Link>
          <Link href="/brands" className="hover:text-brand whitespace-nowrap">
            Top Brands
          </Link>
          <Link href="/account/giftcards" className="hover:text-brand whitespace-nowrap">
            🎁 Gift Cards
          </Link>
          <Link href="/account/loyalty" className="hover:text-brand whitespace-nowrap">
            🪙 SKT Coins
          </Link>
          <Link href="/track" className="hover:text-brand whitespace-nowrap">
            📦 Track Order
          </Link>
          <Link href="/contact" className="hover:text-brand whitespace-nowrap">
            Help
          </Link>
        </div>
      </div>
    </header>
  );
}
