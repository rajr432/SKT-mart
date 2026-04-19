"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";
import MobileDrawer from "./MobileDrawer";
import VoiceSearch from "./VoiceSearch";
import DarkModeToggle from "./DarkModeToggle";

export default function Header() {
  const { user, token, logout } = useAuth();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [open, setOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);

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
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="bg-brand text-white sticky top-0 z-40 shadow">
      <div className="container-page flex items-center gap-2 py-2.5">
        <MobileDrawer />
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="SKT Mart home">
          <span className="bg-white rounded-md p-1 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="SKT Mart" className="h-8 w-auto" />
          </span>
          <span className="hidden md:inline text-[11px] italic text-brand-yellow leading-tight">
            Shop Smart,<br />Live Better
          </span>
        </Link>

        <form onSubmit={submit} className="relative flex-1 max-w-2xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search for products, brands and more"
            className="w-full text-gray-900 text-sm rounded-sm px-3 py-2 pr-10 focus:outline-none"
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            <VoiceSearch />
            <button
              type="submit"
              className="h-full px-3 text-brand"
              aria-label="search"
            >
              🔍
            </button>
          </div>
          {open && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white text-gray-900 shadow-lg mt-1 z-50 max-h-72 overflow-auto">
              {suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={`/product/${s.slug}`}
                  className="block px-3 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </form>

        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
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
                    href="/account/gift-cards"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🎁 Gift Cards
                  </Link>
                  <Link
                    href="/account/referrals"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🤝 Refer &amp; Earn
                  </Link>
                  <Link
                    href="/notifications"
                    className="block px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🔔 Notifications {notifCount > 0 && `(${notifCount})`}
                  </Link>
                  <Link href="/returns" className="block px-4 py-2 hover:bg-gray-100 text-sm">
                    ↩ Returns
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
              className="bg-white text-brand px-6 py-1 font-semibold rounded-sm"
            >
              Login
            </Link>
          )}

          <Link href="/notifications" className="relative" aria-label="notifications">
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
          <Link href="/notifications" className="relative" aria-label="notifications">
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
          <Link href="/gift-cards" className="hover:text-brand whitespace-nowrap">
            🎁 Gift Cards
          </Link>
          <Link href="/account/coins" className="hover:text-brand whitespace-nowrap">
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
