"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV = [
  { group: "Main", links: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/analytics", label: "Analytics" },
  ]},
  { group: "Catalog", links: [
    { href: "/admin/products", label: "Products" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/brands", label: "Brands" },
    { href: "/admin/vendors", label: "Vendors" },
    { href: "/admin/banners", label: "Banners" },
    { href: "/admin/coupons", label: "Coupons" },
    { href: "/admin/flash-sales", label: "Flash Sales" },
  ]},
  { group: "Content", links: [
    { href: "/admin/site-content", label: "Site Content" },
  ]},
  { group: "Commerce", links: [
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/returns", label: "Returns" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/pincodes", label: "Pincodes" },
  ]},
  { group: "Platform", links: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/audit", label: "Audit Log" },
  ]},
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
    <div className="container-page py-4 md:grid md:grid-cols-[220px_1fr] md:gap-4">
      {/* Mobile: horizontal scroll pill nav */}
      <div className="md:hidden mb-3 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 min-w-max">
          {NAV.flatMap((g) => g.links).map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border ${
                  active
                    ? "bg-brand-blue text-white border-brand-blue"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden md:block card p-3 text-sm space-y-1 h-fit sticky top-4">
        <Link href="/admin" className="flex items-center gap-2 px-2 py-2 mb-1 border-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="SKT Mart" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold italic">SKT Mart</p>
            <p className="text-[10px] text-gray-500">Admin Panel</p>
          </div>
        </Link>
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 mt-3 text-[10px] font-semibold uppercase text-gray-500">
              {g.group}
            </p>
            {g.links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block px-3 py-2 rounded hover:bg-gray-100 ${
                    active ? "bg-blue-50 text-brand-blue font-medium" : ""
                  }`}
                >
                  {l.label}
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
