"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

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
    <div className="container-page py-4 grid md:grid-cols-[220px_1fr] gap-4">
      <aside className="card p-3 text-sm space-y-1 h-fit sticky top-4">
        <Link href="/vendor" className="flex items-center gap-2 px-2 py-2 mb-1 border-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="SKT Mart" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold italic">SKT Mart</p>
            <p className="text-[10px] text-gray-500">Seller Panel</p>
          </div>
        </Link>
        <Link href="/vendor" className="block px-3 py-2 rounded hover:bg-gray-100">Dashboard</Link>
        <Link href="/vendor/products" className="block px-3 py-2 rounded hover:bg-gray-100">Products</Link>
        <Link href="/vendor/products/new" className="block px-3 py-2 rounded hover:bg-gray-100">+ Add Product</Link>
        <Link href="/vendor/orders" className="block px-3 py-2 rounded hover:bg-gray-100">Orders</Link>
        <Link href="/vendor/wallet" className="block px-3 py-2 rounded hover:bg-gray-100">Wallet & Payouts</Link>
        <Link href="/vendor/ads" className="block px-3 py-2 rounded hover:bg-gray-100">Ad Campaigns</Link>
      </aside>
      <div>{children}</div>
    </div>
  );
}
