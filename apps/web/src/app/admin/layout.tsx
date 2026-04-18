"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.push("/login?next=/admin");
    else if (user.role !== "ADMIN") router.push("/");
  }, [ready, user, router]);

  return (
    <div className="container-page py-4 grid md:grid-cols-[220px_1fr] gap-4">
      <aside className="card p-3 text-sm space-y-1 h-fit sticky top-4">
        <p className="px-3 text-[10px] font-semibold uppercase text-gray-500">Main</p>
        <Link href="/admin" className="block px-3 py-2 rounded hover:bg-gray-100">Dashboard</Link>
        <Link href="/admin/analytics" className="block px-3 py-2 rounded hover:bg-gray-100">Analytics</Link>
        <p className="px-3 mt-3 text-[10px] font-semibold uppercase text-gray-500">Catalog</p>
        <Link href="/admin/products" className="block px-3 py-2 rounded hover:bg-gray-100">Products</Link>
        <Link href="/admin/vendors" className="block px-3 py-2 rounded hover:bg-gray-100">Vendors</Link>
        <Link href="/admin/banners" className="block px-3 py-2 rounded hover:bg-gray-100">Banners</Link>
        <Link href="/admin/coupons" className="block px-3 py-2 rounded hover:bg-gray-100">Coupons</Link>
        <p className="px-3 mt-3 text-[10px] font-semibold uppercase text-gray-500">Commerce</p>
        <Link href="/admin/orders" className="block px-3 py-2 rounded hover:bg-gray-100">Orders</Link>
        <Link href="/admin/returns" className="block px-3 py-2 rounded hover:bg-gray-100">Returns</Link>
        <Link href="/admin/payouts" className="block px-3 py-2 rounded hover:bg-gray-100">Payouts</Link>
        <p className="px-3 mt-3 text-[10px] font-semibold uppercase text-gray-500">Platform</p>
        <Link href="/admin/users" className="block px-3 py-2 rounded hover:bg-gray-100">Users</Link>
        <Link href="/admin/settings" className="block px-3 py-2 rounded hover:bg-gray-100">Settings</Link>
        <Link href="/admin/audit" className="block px-3 py-2 rounded hover:bg-gray-100">Audit Log</Link>
      </aside>
      <div>{children}</div>
    </div>
  );
}
