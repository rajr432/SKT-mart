"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
}

const items: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", match: (p) => p === "/" },
  {
    href: "/categories",
    label: "Categories",
    icon: "🗂",
    match: (p) => p.startsWith("/categor"),
  },
  {
    href: "/deals",
    label: "Deals",
    icon: "🔥",
    match: (p) => p.startsWith("/deals") || p.startsWith("/brands"),
  },
  { href: "/wishlist", label: "Wishlist", icon: "♥", match: (p) => p.startsWith("/wishlist") },
  { href: "/cart", label: "Cart", icon: "🛒", match: (p) => p.startsWith("/cart") },
  { href: "/account", label: "Account", icon: "👤", match: (p) => p.startsWith("/account") || p.startsWith("/orders") },
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
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
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
              className={`flex flex-col items-center justify-center py-2 relative ${
                active ? "text-brand" : "text-gray-500"
              }`}
            >
              <span className={`text-xl leading-none ${active ? "float-y" : ""}`}>{it.icon}</span>
              {it.href === "/cart" && cartCount > 0 && (
                <span className="absolute top-1 right-3 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
              <span className="mt-0.5 font-medium">{it.label}</span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-6 bg-brand rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
