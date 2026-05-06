"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Stats {
  users: number;
  vendors: number;
  products: number;
  orders: number;
  revenue: number;
}

type IconName =
  | "box"
  | "bag"
  | "shop"
  | "users"
  | "return"
  | "wallet"
  | "tag"
  | "image"
  | "chart"
  | "search"
  | "gear"
  | "money";

const QUICK_ACTIONS: { href: string; icon: IconName; label: string }[] = [
  { href: "/admin/orders", icon: "box", label: "Orders" },
  { href: "/admin/products", icon: "bag", label: "Products" },
  { href: "/admin/vendors", icon: "shop", label: "Vendors" },
  { href: "/admin/users", icon: "users", label: "Users" },
  { href: "/admin/returns", icon: "return", label: "Returns" },
  { href: "/admin/payouts", icon: "wallet", label: "Payouts" },
  { href: "/admin/coupons", icon: "tag", label: "Coupons" },
  { href: "/admin/banners", icon: "image", label: "Banners" },
  { href: "/admin/analytics", icon: "chart", label: "Analytics" },
  { href: "/admin/audit", icon: "search", label: "Audit Log" },
  { href: "/admin/settings", icon: "gear", label: "Settings" },
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<Stats>("/api/admin/stats", { token })
      .then(setStats)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-5">
      {/* Hero — gradient with floating glass orbs */}
      <div className="relative overflow-hidden rounded-3xl text-white p-7 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Admin</p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-2">
            Marketplace control
          </h1>
          <p className="text-xs mt-2 opacity-90 max-w-md">
            Real-time orders, payouts, vendor approvals, and analytics — at a glance.
          </p>
          <div className="flex gap-2 mt-5 flex-wrap">
            <PillLink href="/admin/orders">Manage orders</PillLink>
            <PillLink href="/admin/vendors">Approve vendors</PillLink>
            <PillLink href="/admin/returns">Process returns</PillLink>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-premium p-5">
              <div className="skeleton-shimmer h-3 w-16 rounded" />
              <div className="skeleton-shimmer h-7 w-24 rounded mt-3" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Users" value={stats.users} icon="users" />
          <StatCard label="Vendors" value={stats.vendors} icon="shop" />
          <StatCard label="Products" value={stats.products} icon="bag" />
          <StatCard label="Orders" value={stats.orders} icon="box" />
          <StatCard label="Revenue" value={formatPaise(stats.revenue)} icon="money" big />
        </div>
      ) : null}

      <div className="card-premium p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Shortcuts</p>
        <h2 className="font-display text-base tracking-tight mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-accent/40 hover:bg-violet-50/40 hover:-translate-y-0.5 transition shadow-soft/0 hover:shadow-soft"
            >
              <span className="grid place-items-center h-11 w-11 rounded-2xl bg-violet-50 text-accent group-hover:bg-accent group-hover:text-white transition">
                <AdminIcon name={a.icon} />
              </span>
              <span className="text-xs font-medium tracking-tight text-gray-700">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">System</p>
          <h3 className="font-display text-base tracking-tight mb-3">Recent activity</h3>
          <ul className="text-sm space-y-2 text-gray-700">
            <ActivityRow tone="emerald" label="System operational" />
            <ActivityRow tone="sky" label="Real-time push notifications active" />
            <ActivityRow tone="violet" label="Email alerts sending via SMTP" />
            <ActivityRow tone="amber" label="WhatsApp vendor notifications ready" />
          </ul>
        </div>
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">To do</p>
          <h3 className="font-display text-base tracking-tight mb-3">Action items</h3>
          <ul className="text-sm space-y-2.5">
            <ActionLink href="/admin/vendors" label="Review pending vendor approvals" />
            <ActionLink href="/admin/returns" label="Process return requests" />
            <ActionLink href="/admin/payouts" label="Release vendor payouts" />
            <ActionLink href="/admin/analytics" label="View today's sales report" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-white/15 hover:bg-white/25 backdrop-blur text-[11px] uppercase tracking-wider rounded-full px-4 py-2 transition border border-white/10"
    >
      {children}
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  big,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  big?: boolean;
}) {
  return (
    <div
      className={`card-premium p-5 relative overflow-hidden ${
        big ? "col-span-2 md:col-span-1" : ""
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500" />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400">{label}</span>
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-violet-50 text-accent">
          <AdminIcon name={icon} />
        </span>
      </div>
      <p className="font-display text-2xl tracking-tightest mt-3 text-gray-900">{value}</p>
    </div>
  );
}

function ActivityRow({
  tone,
  label,
}: {
  tone: "emerald" | "sky" | "violet" | "amber";
  label: string;
}) {
  const dot = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
  }[tone];
  return (
    <li className="flex items-center gap-3">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-gray-700">{label}</span>
    </li>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-2 rounded-2xl border border-gray-100 px-4 py-2.5 hover:border-accent/40 hover:bg-violet-50/40 transition group"
      >
        <span className="text-sm tracking-tight text-gray-700 group-hover:text-accent">
          {label}
        </span>
        <span className="text-gray-300 group-hover:text-accent">→</span>
      </Link>
    </li>
  );
}

function AdminIcon({ name }: { name: IconName }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px]",
  };
  if (name === "box")
    return (
      <svg {...c}>
        <path d="m3 7 9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
      </svg>
    );
  if (name === "bag")
    return (
      <svg {...c}>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7V5a3 3 0 1 1 6 0v2" />
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
  if (name === "users")
    return (
      <svg {...c}>
        <circle cx="9" cy="9" r="3.5" />
        <path d="M3 19c1-3 4-4.5 6-4.5s5 1.5 6 4.5" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M14 19c.7-2 2-3 3-3s2.3 1 3 3" />
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
  if (name === "tag")
    return (
      <svg {...c}>
        <path d="M3 12V4h8l9 9-8 8-9-9Z" />
        <circle cx="8" cy="8" r="1.3" />
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
  if (name === "chart")
    return (
      <svg {...c}>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M3 20h18" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...c}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  if (name === "money")
    return (
      <svg {...c}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <circle cx="12" cy="12.5" r="2.5" />
        <path d="M6 9v0M18 16v0" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </svg>
  );
}
