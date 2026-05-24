"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type NavIcon =
  | "grid"
  | "chart"
  | "bag"
  | "tree"
  | "tag"
  | "shop"
  | "image"
  | "ticket"
  | "flash"
  | "boxes"
  | "edit"
  | "box"
  | "return"
  | "wallet"
  | "pin"
  | "users"
  | "gear"
  | "search";

const NAV: { group: string; links: { href: string; label: string; icon: NavIcon }[] }[] = [
  {
    group: "Main",
    links: [
      { href: "/admin", label: "Dashboard", icon: "grid" },
      { href: "/admin/analytics", label: "Analytics", icon: "chart" },
    ],
  },
  {
    group: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: "bag" },
      { href: "/admin/categories", label: "Categories", icon: "tree" },
      { href: "/admin/brands", label: "Brands", icon: "tag" },
      { href: "/admin/vendors", label: "Vendors", icon: "shop" },
      { href: "/admin/banners", label: "Banners", icon: "image" },
      { href: "/admin/coupons", label: "Coupons", icon: "ticket" },
      { href: "/admin/flash-sales", label: "Flash Sales", icon: "flash" },
      { href: "/admin/bundles", label: "Bundles", icon: "boxes" },
    ],
  },
  {
    group: "Content",
    links: [{ href: "/admin/site-content", label: "Site Content", icon: "edit" }],
  },
  {
    group: "Commerce",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "box" },
      { href: "/admin/returns", label: "Returns", icon: "return" },
      { href: "/admin/payouts", label: "Payouts", icon: "wallet" },
      { href: "/admin/pincodes", label: "Pincodes", icon: "pin" },
    ],
  },
  {
    group: "Platform",
    links: [
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/settings", label: "Settings", icon: "gear" },
      { href: "/admin/audit", label: "Audit Log", icon: "search" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.push("/login?next=/admin");
    else if (user.role !== "ADMIN") router.push("/");
  }, [ready, user, router]);

  return (
    <div className="container-page py-4 md:grid md:grid-cols-[240px_1fr] md:gap-5">
      {/* Mobile: horizontal scroll pill nav */}
      <div className="md:hidden mb-3 -mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {NAV.flatMap((g) => g.links).map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] uppercase tracking-wider font-medium border transition ${
                  active
                    ? "bg-accent text-white border-accent shadow-soft"
                    : "bg-white text-gray-600 border-gray-100 hover:border-accent/40"
                }`}
              >
                <NavIconSvg name={l.icon} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden md:block card-premium p-3 text-sm space-y-1 h-fit sticky top-4">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 px-2 py-2.5 mb-1 border-b border-gray-100"
        >
          <span className="grid place-items-center h-9 w-9 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white shadow-soft overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="SKT Mart" className="h-full w-full object-cover" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm tracking-tight">SKT Mart</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Admin</p>
          </div>
        </Link>
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              {g.group}
            </p>
            {g.links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-2xl transition ${
                    active
                      ? "bg-violet-50/60 text-accent font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`grid place-items-center h-7 w-7 rounded-xl ${
                      active ? "bg-accent text-white" : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    <NavIconSvg name={l.icon} />
                  </span>
                  <span className="tracking-tight">{l.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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
    className: "h-[14px] w-[14px]",
  };
  if (name === "grid")
    return (
      <svg {...c}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  if (name === "chart")
    return (
      <svg {...c}>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M3 20h18" />
      </svg>
    );
  if (name === "bag")
    return (
      <svg {...c}>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7V5a3 3 0 1 1 6 0v2" />
      </svg>
    );
  if (name === "tree")
    return (
      <svg {...c}>
        <path d="M4 6h6M4 12h10M4 18h7" />
        <circle cx="14" cy="6" r="1.5" />
        <circle cx="18" cy="12" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    );
  if (name === "tag")
    return (
      <svg {...c}>
        <path d="M3 12V4h8l9 9-8 8-9-9Z" />
        <circle cx="8" cy="8" r="1.3" />
      </svg>
    );
  if (name === "shop")
    return (
      <svg {...c}>
        <path d="M4 9h16l-1 11H5L4 9Z" />
        <path d="M4 9 5 5h14l1 4" />
        <path d="M9 13h6" />
      </svg>
    );
  if (name === "image")
    return (
      <svg {...c}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8" cy="10" r="1.5" />
        <path d="m21 17-5-5-9 9" />
      </svg>
    );
  if (name === "ticket")
    return (
      <svg {...c}>
        <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
        <path d="M11 6v12" />
      </svg>
    );
  if (name === "flash")
    return (
      <svg {...c}>
        <path d="m13 3-9 12h7l-1 6 9-12h-7l1-6Z" />
      </svg>
    );
  if (name === "boxes")
    return (
      <svg {...c}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  if (name === "edit")
    return (
      <svg {...c}>
        <path d="M4 20h4l11-11-4-4L4 16v4Z" />
        <path d="m14 6 4 4" />
      </svg>
    );
  if (name === "box")
    return (
      <svg {...c}>
        <path d="m3 7 9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
      </svg>
    );
  if (name === "return")
    return (
      <svg {...c}>
        <path d="M3 12h13a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8" />
        <path d="m6 9-3 3 3 3" />
      </svg>
    );
  if (name === "wallet")
    return (
      <svg {...c}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M16 13.5h2.5" />
      </svg>
    );
  if (name === "pin")
    return (
      <svg {...c}>
        <path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  if (name === "users")
    return (
      <svg {...c}>
        <circle cx="9" cy="9" r="3.5" />
        <path d="M3 19c1-3 4-4.5 6-4.5s5 1.5 6 4.5" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M14 19c.7-2 2-3 3-3s2.3 1 3 3" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...c}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </svg>
  );
}
