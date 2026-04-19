"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface Group {
  title: string;
  items: Array<{ href: string; label: string; icon: string; badge?: string }>;
}

export default function MobileDrawer() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups: Group[] = [
    {
      title: "My Account",
      items: [
        { href: "/account", label: "Account info", icon: "👤" },
        { href: "/orders", label: "My orders", icon: "📦" },
        { href: "/wishlist", label: "Wishlist", icon: "♥" },
        { href: "/account/returns", label: "Returns & refunds", icon: "↩" },
        { href: "/account/reviews", label: "My reviews", icon: "⭐" },
      ],
    },
    {
      title: "Wallet & rewards",
      items: [
        { href: "/account/wallet", label: "SKT Wallet", icon: "💰" },
        { href: "/account/loyalty", label: "SKT Coins", icon: "🪙" },
        { href: "/account/gift-cards", label: "Gift Cards", icon: "🎁" },
        { href: "/account/referrals", label: "Refer & Earn", icon: "🤝" },
        { href: "/account/coupons", label: "Coupons", icon: "🏷" },
      ],
    },
    {
      title: "Shop",
      items: [
        { href: "/deals", label: "Today's Deals", icon: "🔥" },
        { href: "/brands", label: "Top Brands", icon: "🏷" },
        { href: "/categories", label: "All Categories", icon: "🗂" },
        { href: "/category/mobiles", label: "Mobiles", icon: "📱" },
        { href: "/category/fashion", label: "Fashion", icon: "👗" },
        { href: "/category/electronics", label: "Electronics", icon: "💻" },
        { href: "/category/home-kitchen", label: "Home & Kitchen", icon: "🏠" },
        { href: "/category/beauty", label: "Beauty", icon: "💄" },
        { href: "/category/books", label: "Books", icon: "📚" },
        { href: "/category/sports", label: "Sports", icon: "⚽" },
      ],
    },
    {
      title: "Support & info",
      items: [
        { href: "/track", label: "Track Order", icon: "🚚" },
        { href: "/notifications", label: "Notifications", icon: "🔔" },
        { href: "/contact", label: "Contact us", icon: "📞" },
        { href: "/about", label: "About SKT Mart", icon: "ℹ" },
        { href: "/policies/privacy", label: "Privacy Policy", icon: "🔒" },
        { href: "/policies/terms", label: "Terms", icon: "📄" },
      ],
    },
  ];

  if (user) {
    const earn = groups[2];
    if (user.role === "CUSTOMER") {
      earn.items.unshift({ href: "/vendor/onboarding", label: "Become a Seller", icon: "🛍" });
    }
    if (user.role === "VENDOR") {
      earn.items.unshift({ href: "/vendor", label: "Vendor Dashboard", icon: "🏪" });
    }
    if (user.role === "ADMIN") {
      earn.items.unshift({ href: "/admin", label: "Admin Panel", icon: "🛡" });
    }
  }

  return (
    <>
      <button
        className="md:hidden text-white text-2xl leading-none px-1"
        aria-label="menu"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-[86%] max-w-sm bg-white z-[70] md:hidden shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="bg-brand text-white p-4 pb-5">
          <button
            className="absolute top-2 right-2 text-2xl text-white/80 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="close"
          >
            ×
          </button>
          {user ? (
            <Link
              href="/account"
              className="flex items-center gap-3"
              onClick={() => setOpen(false)}
            >
              <span className="bg-brand-yellow text-brand rounded-full w-12 h-12 grid place-items-center font-bold text-lg">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-semibold truncate">Hi, {user.name.split(" ")[0]}</p>
                <p className="text-xs opacity-85 truncate">{user.email ?? user.phone}</p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <span className="bg-white/20 rounded-full w-12 h-12 grid place-items-center text-2xl">
                👋
              </span>
              <div>
                <p className="font-semibold">Welcome to SKT Mart</p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-xs underline opacity-90"
                >
                  Login / Sign up
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto h-[calc(100%-105px)] pb-10">
          {groups.map((g) => (
            <div key={g.title} className="pt-3">
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {g.title}
              </p>
              <ul>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="w-6 text-center">{it.icon}</span>
                      <span className="flex-1">{it.label}</span>
                      <span className="text-gray-300">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-b mx-4 mt-1.5" />
            </div>
          ))}
          {user && (
            <button
              onClick={() => {
                logout();
                setOpen(false);
                router.push("/");
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 mt-2 font-medium"
            >
              <span className="w-6 text-center">⎋</span> Logout
            </button>
          )}
          <p className="text-center text-[10px] text-gray-400 mt-4 mb-6">SKT Mart · v1.0</p>
        </div>
      </aside>
    </>
  );
}
