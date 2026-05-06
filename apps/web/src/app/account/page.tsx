"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Address } from "@/lib/types";

interface Counts {
  orders: number;
  wishlist: number;
  wallet: number;
  coins: number;
  notifUnread: number;
  cart: number;
  returns: number;
}

export default function AccountPage() {
  const { token, user, ready, logout } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [counts, setCounts] = useState<Counts>({
    orders: 0,
    wishlist: 0,
    wallet: 0,
    coins: 0,
    notifUnread: 0,
    cart: 0,
    returns: 0,
  });

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/account");
      return;
    }
    (async () => {
      const [addr, orders, wish, wallet, notif, cart, ret] = await Promise.all([
        api<{ items: Address[] }>("/api/addresses", { token }).catch(() => ({ items: [] })),
        api<{ items: unknown[] }>("/api/orders", { token }).catch(() => ({ items: [] })),
        api<{ items: unknown[] }>("/api/wishlist", { token }).catch(() => ({ items: [] })),
        api<{ balance: number; loyalty: number }>("/api/wallet", { token }).catch(() => ({
          balance: 0,
          loyalty: 0,
        })),
        api<{ items: Array<{ read: boolean }> }>("/api/notifications", { token }).catch(() => ({
          items: [],
        })),
        api<{ items: unknown[] }>("/api/cart", { token }).catch(() => ({ items: [] })),
        api<{ items: unknown[] }>("/api/returns/mine", { token }).catch(() => ({ items: [] })),
      ]);
      setAddresses(addr.items);
      setCounts({
        orders: orders.items.length,
        wishlist: wish.items.length,
        wallet: wallet.balance,
        coins: wallet.loyalty,
        notifUnread: notif.items.filter((i) => !i.read).length,
        cart: cart.items.length,
        returns: ret.items.length,
      });
    })();
  }, [ready, token, router]);

  if (!user)
    return (
      <div className="container-page py-8">
        <div className="card-premium p-5 flex items-center gap-3">
          <div className="skeleton-shimmer h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-line w-32" />
            <div className="skeleton-line w-48 h-2" />
          </div>
        </div>
      </div>
    );

  type IconKey =
    | "box"
    | "cart"
    | "heart"
    | "return"
    | "bell"
    | "star"
    | "alert"
    | "wallet"
    | "coin"
    | "gift"
    | "tag"
    | "users"
    | "flame"
    | "grid"
    | "truck"
    | "chat"
    | "shop"
    | "shield"
    | "plus";
  type Tile = { href: string; label: string; icon: IconKey; count?: number | string };
  type Section = { title: string; tiles: Tile[] };

  const rupees = (p: number) => `₹${(p / 100).toFixed(0)}`;
  const firstAddr = addresses.find((a) => a.isDefault) ?? addresses[0];

  const sections: Section[] = [
    {
      title: "My activity",
      tiles: [
        { href: "/orders", label: "Orders", icon: "box", count: counts.orders },
        { href: "/cart", label: "Cart", icon: "cart", count: counts.cart },
        { href: "/wishlist", label: "Wishlist", icon: "heart", count: counts.wishlist },
        { href: "/account/returns", label: "Returns", icon: "return", count: counts.returns },
        {
          href: "/account/notifications",
          label: "Notifications",
          icon: "bell",
          count: counts.notifUnread,
        },
        { href: "/account/reviews", label: "My reviews", icon: "star" },
        { href: "/account/alerts", label: "My alerts", icon: "alert" },
      ],
    },
    {
      title: "Wallet & rewards",
      tiles: [
        { href: "/account/wallet", label: "SKT Wallet", icon: "wallet", count: rupees(counts.wallet) },
        { href: "/account/loyalty", label: "SKT Coins", icon: "coin", count: counts.coins },
        { href: "/account/giftcards", label: "Gift Cards", icon: "gift" },
        { href: "/account/coupons", label: "Coupons", icon: "tag" },
        { href: "/account/referral", label: "Refer & Earn", icon: "users" },
      ],
    },
    {
      title: "Explore",
      tiles: [
        { href: "/deals", label: "Today's Deals", icon: "flame" },
        { href: "/brands", label: "Top Brands", icon: "tag" },
        { href: "/categories", label: "Categories", icon: "grid" },
        { href: "/track", label: "Track Order", icon: "truck" },
        { href: "/contact", label: "Help & Support", icon: "chat" },
      ],
    },
  ];

  const sellerTile: Tile | null =
    user.role === "CUSTOMER"
      ? { href: "/vendor/onboarding", label: "Become a Seller", icon: "plus" }
      : user.role === "VENDOR"
      ? { href: "/vendor", label: "Vendor Dashboard", icon: "shop" }
      : user.role === "ADMIN"
      ? { href: "/admin", label: "Admin Panel", icon: "shield" }
      : null;
  if (sellerTile) sections[2].tiles.push(sellerTile);

  return (
    <div className="min-h-screen pb-6">
      {/* Profile header — accent gradient with floating glass orbs */}
      <div className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="container-page relative z-10 px-4 pt-7 pb-14">
          <div className="flex items-center gap-4">
            <div className="glass rounded-3xl w-16 h-16 grid place-items-center text-2xl font-display font-bold shadow-soft pop-in">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">Welcome back</p>
              <h1 className="font-display text-xl sm:text-2xl tracking-tightest truncate">
                {user.name}
              </h1>
              <p className="text-xs opacity-90 truncate">
                {user.email ?? user.phone} ·{" "}
                <span className="uppercase tracking-wide">{user.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip — premium card overlap */}
      <div className="container-page -mt-9 relative z-10 px-3">
        <div className="grid grid-cols-4 bg-white rounded-3xl shadow-soft overflow-hidden text-center">
          {[
            { href: "/account/wallet", value: rupees(counts.wallet), label: "Wallet" },
            { href: "/account/loyalty", value: counts.coins, label: "Coins" },
            { href: "/orders", value: counts.orders, label: "Orders" },
            { href: "/wishlist", value: counts.wishlist, label: "Wishlist" },
          ].map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className={`p-3.5 hover:bg-gray-50 active:bg-gray-100 transition ${
                i > 0 ? "border-l border-gray-100" : ""
              }`}
            >
              <p className="font-display text-base sm:text-lg font-semibold tracking-tight text-accent">
                {s.value}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.18em] mt-0.5">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="container-page px-3 mt-5 space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              {sec.title}
            </p>
            <ul className="divide-y divide-gray-100">
              {sec.tiles.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <span className="grid place-items-center h-9 w-9 rounded-2xl bg-violet-50 text-accent">
                      <TileIcon name={t.icon} />
                    </span>
                    <span className="flex-1 text-sm font-medium">{t.label}</span>
                    {t.count !== undefined && t.count !== 0 && t.count !== "" && (
                      <span className="text-xs bg-accent/10 text-accent font-semibold px-2.5 py-0.5 rounded-full">
                        {t.count}
                      </span>
                    )}
                    <span className="text-gray-300 group-hover:text-accent">
                      <Chevron />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Addresses */}
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="flex justify-between items-center px-5 pt-4 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Saved addresses ({addresses.length})
            </p>
            <Link href="/checkout" className="link-accent text-xs">
              Manage
            </Link>
          </div>
          <div className="px-5 pb-5 pt-2">
            {firstAddr ? (
              <div className="border border-gray-100 rounded-2xl p-4 text-sm bg-gradient-to-br from-violet-50/40 to-transparent">
                <p className="font-medium">
                  {firstAddr.name}{" "}
                  {firstAddr.isDefault && (
                    <span className="ml-2 text-[10px] bg-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-gray-600 mt-1">
                  {firstAddr.line1}, {firstAddr.city} — {firstAddr.pincode}
                </p>
                <p className="text-gray-500 text-xs mt-1">{firstAddr.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No saved addresses yet.</p>
            )}
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <p className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Legal
          </p>
          <ul className="divide-y divide-gray-100 text-sm">
            {[
              ["/terms", "Terms of Use"],
              ["/privacy-policy", "Privacy Policy"],
              ["/return-policy", "Return Policy"],
              ["/refund-policy", "Refund Policy"],
              ["/shipping-policy", "Shipping Policy"],
              ["/about", "About SKT Mart"],
              ["/contact", "Contact / Grievance"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition"
                >
                  <span>{label}</span>
                  <span className="text-gray-300">
                    <Chevron />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="w-full bg-white shadow-soft rounded-3xl py-3.5 text-rose-600 font-semibold text-sm hover:bg-rose-50 transition"
        >
          Logout
        </button>
        <p className="text-center text-[10px] text-gray-400 tracking-wide">
          SKT Mart · Crafted with care · Made in India
        </p>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TileIcon({
  name,
}: {
  name:
    | "box"
    | "cart"
    | "heart"
    | "return"
    | "bell"
    | "star"
    | "alert"
    | "wallet"
    | "coin"
    | "gift"
    | "tag"
    | "users"
    | "flame"
    | "grid"
    | "truck"
    | "chat"
    | "shop"
    | "shield"
    | "plus";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px]",
  };
  switch (name) {
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M3 4h2l2.5 12a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5L21 8H6" />
          <circle cx="9.5" cy="20.5" r="1.5" />
          <circle cx="17.5" cy="20.5" r="1.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.5-9-9.5C1.5 6.5 4.5 4 7.5 4c1.7 0 3.2.8 4.5 2.3C13.3 4.8 14.8 4 16.5 4c3 0 6 2.5 4.5 6.5-2 5-9 9.5-9 9.5Z" />
        </svg>
      );
    case "return":
      return (
        <svg {...common}>
          <path d="M9 14H5v4" />
          <path d="M5 14a8 8 0 1 1 2.5 5.7" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-14.1a2 2 0 0 0-3.4 0Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1.1-6.1L3.3 9.4l6-.9L12 3Z" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M16 13.5h2.5" />
          <path d="M3 9h13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H3" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9h4a2 2 0 1 1 0 4h-3.5a2 2 0 1 0 0 4h4.5" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <rect x="3" y="9" width="18" height="11" rx="1" />
          <path d="M3 13h18" />
          <path d="M12 9v11" />
          <path d="M8.5 9c-1.5 0-2.5-1-2.5-2.5S7 4 8.5 4 12 6.5 12 9c0-2.5 2-5 3.5-5S18 5 18 6.5 17 9 15.5 9" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M3 12V4h8l10 10-8 8L3 12Z" />
          <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M21.5 18.5a4.5 4.5 0 0 0-6.5-3.9" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 3c1 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 .5-3-1-5 1-8Z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "shop":
      return (
        <svg {...common}>
          <path d="M3 9l1-5h16l1 5" />
          <path d="M4 9v11h16V9" />
          <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
          <path d="M9.5 12.5l2 2 4-4" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
  }
}
