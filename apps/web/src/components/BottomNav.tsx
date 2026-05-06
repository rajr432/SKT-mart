"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
  match: (path: string) => boolean;
}

const STROKE = (active: boolean) => ({
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: active ? 2 : 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const items: NavItem[] = [
  {
    href: "/",
    label: "Home",
    match: (p) => p === "/",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
  {
    href: "/categories",
    label: "Shop",
    match: (p) => p.startsWith("/categor"),
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/deals",
    label: "Deals",
    match: (p) => p.startsWith("/deals") || p.startsWith("/brands"),
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    ),
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    match: (p) => p.startsWith("/wishlist"),
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/cart",
    label: "Cart",
    match: (p) => p.startsWith("/cart"),
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    match: (p) => p.startsWith("/account") || p.startsWith("/orders"),
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" {...STROKE(a)}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  const { token, user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setCartCount(0);
      return;
    }
    api<{ items: Array<unknown> }>("/api/cart", { token })
      .then((d) => setCartCount(d.items.length))
      .catch(() => setCartCount(0));
  }, [token, pathname]);

  const accountHref = user ? "/account" : "/login";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden glass border-t border-gray-200/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-6 text-[10px]">
        {items.map((it) => {
          const href = it.href === "/account" ? accountHref : it.href;
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={href}
              className={`flex flex-col items-center justify-center py-2 relative transition-colors ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              <span className="leading-none">{it.icon(active)}</span>
              {it.href === "/cart" && cartCount > 0 && (
                <span className="absolute top-1 right-3 bg-accent text-white text-[9px] rounded-full w-4 h-4 grid place-items-center font-semibold">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
              <span className={`mt-1 ${active ? "font-semibold" : "font-medium"}`}>{it.label}</span>
              {active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
