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
  }, [ready, user]);

  return (
    <div className="container-page py-4 grid md:grid-cols-[200px_1fr] gap-4">
      <aside className="card p-3 text-sm space-y-1 h-fit">
        <Link href="/admin" className="block px-3 py-2 rounded hover:bg-gray-100">
          Dashboard
        </Link>
        <Link href="/admin/vendors" className="block px-3 py-2 rounded hover:bg-gray-100">
          Vendors
        </Link>
        <Link href="/admin/products" className="block px-3 py-2 rounded hover:bg-gray-100">
          Products
        </Link>
        <Link href="/admin/orders" className="block px-3 py-2 rounded hover:bg-gray-100">
          Orders
        </Link>
        <Link href="/admin/users" className="block px-3 py-2 rounded hover:bg-gray-100">
          Users
        </Link>
        <Link href="/admin/banners" className="block px-3 py-2 rounded hover:bg-gray-100">
          Banners
        </Link>
        <Link href="/admin/coupons" className="block px-3 py-2 rounded hover:bg-gray-100">
          Coupons
        </Link>
      </aside>
      <div>{children}</div>
    </div>
  );
}
