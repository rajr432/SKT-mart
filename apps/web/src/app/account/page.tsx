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

  if (!user) return <div className="container-page py-8">Loading…</div>;

  type Tile = { href: string; label: string; icon: string; count?: number | string };
  type Section = { title: string; tiles: Tile[] };

  const rupees = (p: number) => `₹${(p / 100).toFixed(0)}`;
  const firstAddr = addresses.find((a) => a.isDefault) ?? addresses[0];

  const sections: Section[] = [
    {
      title: "My activity",
      tiles: [
        { href: "/orders", label: "Orders", icon: "📦", count: counts.orders },
        { href: "/cart", label: "Cart", icon: "🛒", count: counts.cart },
        { href: "/wishlist", label: "Wishlist", icon: "♥", count: counts.wishlist },
        { href: "/account/returns", label: "Returns", icon: "↩", count: counts.returns },
        {
          href: "/account/notifications",
          label: "Notifications",
          icon: "🔔",
          count: counts.notifUnread,
        },
        { href: "/account/reviews", label: "My reviews", icon: "⭐" },
        { href: "/account/alerts", label: "My alerts", icon: "🔔" },
      ],
    },
    {
      title: "Wallet & rewards",
      tiles: [
        { href: "/account/wallet", label: "SKT Wallet", icon: "💰", count: rupees(counts.wallet) },
        { href: "/account/loyalty", label: "SKT Coins", icon: "🪙", count: counts.coins },
        { href: "/account/giftcards", label: "Gift Cards", icon: "🎁" },
        { href: "/account/coupons", label: "Coupons", icon: "🏷" },
        { href: "/account/referral", label: "Refer & Earn", icon: "🤝" },
      ],
    },
    {
      title: "Explore",
      tiles: [
        { href: "/deals", label: "Today's Deals", icon: "🔥" },
        { href: "/brands", label: "Top Brands", icon: "🏷" },
        { href: "/categories", label: "Categories", icon: "🗂" },
        { href: "/track", label: "Track Order", icon: "🚚" },
        { href: "/contact", label: "Help & Support", icon: "💬" },
      ],
    },
  ];

  const sellerTile: Tile | null =
    user.role === "CUSTOMER"
      ? { href: "/vendor/onboarding", label: "Become a Seller", icon: "🛍" }
      : user.role === "VENDOR"
      ? { href: "/vendor", label: "Vendor Dashboard", icon: "🏪" }
      : user.role === "ADMIN"
      ? { href: "/admin", label: "Admin Panel", icon: "🛡" }
      : null;
  if (sellerTile) sections[2].tiles.push(sellerTile);

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-brand to-blue-700 text-white px-4 pt-6 pb-12 relative">
        <div className="container-page relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-brand-yellow text-brand rounded-full w-16 h-16 grid place-items-center text-2xl font-bold shadow-lg pop-in">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs opacity-85">Welcome back</p>
              <h1 className="text-xl font-semibold truncate">{user.name}</h1>
              <p className="text-xs opacity-90 truncate">
                {user.email ?? user.phone} · <span className="uppercase">{user.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="container-page -mt-8 relative z-10 px-3">
        <div className="grid grid-cols-4 bg-white rounded-lg shadow-md overflow-hidden text-center">
          <Link href="/account/wallet" className="p-3 hover:bg-gray-50 active:bg-gray-100">
            <p className="text-base font-bold text-brand">{rupees(counts.wallet)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Wallet</p>
          </Link>
          <Link href="/account/loyalty" className="p-3 hover:bg-gray-50 border-l">
            <p className="text-base font-bold text-brand">{counts.coins}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Coins</p>
          </Link>
          <Link href="/orders" className="p-3 hover:bg-gray-50 border-l">
            <p className="text-base font-bold text-brand">{counts.orders}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Orders</p>
          </Link>
          <Link href="/wishlist" className="p-3 hover:bg-gray-50 border-l">
            <p className="text-base font-bold text-brand">{counts.wishlist}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Wishlist</p>
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div className="container-page px-3 mt-4 space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {sec.title}
            </p>
            <ul className="divide-y">
              {sec.tiles.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="text-xl w-7 text-center">{t.icon}</span>
                    <span className="flex-1 text-sm font-medium">{t.label}</span>
                    {t.count !== undefined && t.count !== 0 && t.count !== "" && (
                      <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                        {t.count}
                      </span>
                    )}
                    <span className="text-gray-300">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Addresses */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-4 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Saved addresses ({addresses.length})
            </p>
            <Link href="/checkout" className="text-xs text-brand font-medium">
              Manage
            </Link>
          </div>
          <div className="px-4 pb-4 pt-2">
            {firstAddr ? (
              <div className="border rounded p-3 text-sm">
                <p className="font-medium">
                  {firstAddr.name}{" "}
                  {firstAddr.isDefault && (
                    <span className="ml-2 text-[10px] bg-brand text-white px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-gray-600 mt-1">
                  {firstAddr.line1}, {firstAddr.city} — {firstAddr.pincode}
                </p>
                <p className="text-gray-600">📞 {firstAddr.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No saved addresses yet.</p>
            )}
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Legal
          </p>
          <ul className="divide-y text-sm">
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
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span>{label}</span>
                  <span className="text-gray-300">›</span>
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
          className="w-full bg-white shadow-sm rounded-lg py-3 text-red-600 font-semibold text-sm hover:bg-red-50"
        >
          ⎋ Logout
        </button>
        <p className="text-center text-[10px] text-gray-400">SKT Mart · v1.0 · Made in India 🇮🇳</p>
      </div>
    </div>
  );
}
