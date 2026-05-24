"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type NavIcon =
  | "dashboard"
  | "products"
  | "plus"
  | "orders"
  | "wallet"
  | "ads"
  | "coupon";

const NAV: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/vendor", label: "Dashboard", icon: "dashboard" },
  { href: "/vendor/products", label: "Products", icon: "products" },
  { href: "/vendor/products/new", label: "Add product", icon: "plus" },
  { href: "/vendor/orders", label: "Orders", icon: "orders" },
  { href: "/vendor/wallet", label: "Wallet & payouts", icon: "wallet" },
  { href: "/vendor/ads", label: "Ad campaigns", icon: "ads" },
  { href: "/vendor/coupons", label: "Store coupons", icon: "coupon" },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.push("/login?next=/vendor");
    else if (user.role === "CUSTOMER") router.push("/vendor/onboarding");
  }, [ready, user, router]);

  if (path === "/vendor/onboarding") return <>{children}</>;

  return (
    <div className="container-page py-4 grid md:grid-cols-[240px_1fr] gap-4">
      <aside className="card-premium p-4 text-sm space-y-1 h-fit md:sticky md:top-4">
        <Link href="/vendor" className="flex items-center gap-3 px-2 py-2 mb-3 border-b border-gray-100 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="SKT Mart" className="h-10 w-10 rounded-2xl object-cover" />
          <div className="leading-tight">
            <p className="font-display text-sm tracking-tight">SKT Mart</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Seller panel</p>
          </div>
        </Link>
        {NAV.map((n) => {
          const active = path === n.href || (n.href !== "/vendor" && path.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition ${
                active
                  ? "bg-accent text-white shadow-soft"
                  : "text-gray-700 hover:bg-violet-50 hover:text-accent"
              }`}
            >
              <span className={`grid place-items-center h-8 w-8 rounded-xl transition ${
                active ? "bg-white/15 text-white" : "bg-violet-50 text-accent group-hover:bg-accent group-hover:text-white"
              }`}>
                <NavIconSvg name={n.icon} />
              </span>
              <span className="font-medium tracking-tight">{n.label}</span>
            </Link>
          );
        })}
      </aside>
      <div>{children}</div>
    </div>
  );
}

function NavIconSvg({ name }: { name: NavIcon }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[16px] w-[16px]",
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...c}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "products":
      return (
        <svg {...c}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </svg>
      );
    case "plus":
      return (
        <svg {...c}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "orders":
      return (
        <svg {...c}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...c}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M16 13.5h2.5" />
          <path d="M3 9h13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H3" />
        </svg>
      );
    case "ads":
      return (
        <svg {...c}>
          <path d="M3 11v2a4 4 0 0 0 4 4h1l5 4V5L8 9H7a4 4 0 0 0-4 4Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
        </svg>
      );
    case "coupon":
      return (
        <svg {...c}>
          <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" />
          <path d="M9 9h6M9 13h4" />
        </svg>
      );
  }
}
