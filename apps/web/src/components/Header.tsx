"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";

export default function Header() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [open, setOpen] = useState(false);
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="bg-brand text-white sticky top-0 z-40 shadow">
      <div className="container-page flex items-center gap-3 py-2.5">
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
          <button
            type="submit"
            className="absolute right-0 top-0 h-full px-3 text-brand"
            aria-label="search"
          >
            🔍
          </button>
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

        <nav className="hidden sm:flex items-center gap-5 text-sm font-medium">
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-1">
                {user.name.split(" ")[0]} <span>▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white text-gray-900 shadow-lg rounded-sm min-w-[180px] hidden group-hover:block">
                <Link href="/account" className="block px-4 py-2 hover:bg-gray-100">
                  My Account
                </Link>
                <Link href="/orders" className="block px-4 py-2 hover:bg-gray-100">
                  Orders
                </Link>
                <Link href="/wishlist" className="block px-4 py-2 hover:bg-gray-100">
                  Wishlist
                </Link>
                {user.role === "VENDOR" && (
                  <Link href="/vendor" className="block px-4 py-2 hover:bg-gray-100">
                    Vendor Dashboard
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100">
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="bg-white text-brand px-6 py-1 font-semibold rounded-sm">
              Login
            </Link>
          )}
          <Link href="/deals" className="hover:underline hidden md:inline">
            🔥 Deals
          </Link>
          <Link href="/brands" className="hover:underline hidden md:inline">
            Brands
          </Link>
          <Link href="/vendor/onboarding" className="hover:underline">
            Become a Seller
          </Link>
          <Link href="/cart" className="flex items-center gap-1">
            🛒 Cart
          </Link>
        </nav>
      </div>
    </header>
  );
}
