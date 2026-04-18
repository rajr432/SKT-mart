"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Address } from "@/lib/types";

export default function AccountPage() {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/account");
      return;
    }
    (async () => {
      const { items } = await api<{ items: Address[] }>("/api/addresses", { token });
      setAddresses(items);
    })();
  }, [ready, token]);

  if (!user) return <div className="container-page py-8">Loading…</div>;

  return (
    <div className="container-page py-6 space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">My Account</h1>
        <p className="text-sm text-gray-600 mt-1">
          {user.name} · {user.email ?? user.phone} · {user.role}
        </p>
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Saved Addresses</h2>
          <Link href="/checkout" className="text-sm text-brand">
            Manage
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {addresses.map((a) => (
            <div key={a.id} className="border p-3 rounded text-sm">
              <p className="font-medium">
                {a.name}
                {a.isDefault && (
                  <span className="ml-2 text-xs bg-brand text-white px-1.5 rounded">Default</span>
                )}
              </p>
              <p className="text-gray-600 mt-1">
                {a.line1}, {a.city} — {a.pincode}
              </p>
              <p className="text-gray-600">📞 {a.phone}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 grid sm:grid-cols-3 gap-3 text-center">
        <Link href="/orders" className="border p-4 rounded hover:bg-gray-50">
          <p className="text-2xl">📦</p>
          <p className="mt-2 font-medium">My Orders</p>
        </Link>
        <Link href="/wishlist" className="border p-4 rounded hover:bg-gray-50">
          <p className="text-2xl">♡</p>
          <p className="mt-2 font-medium">Wishlist</p>
        </Link>
        {user.role === "CUSTOMER" && (
          <Link href="/vendor/onboarding" className="border p-4 rounded hover:bg-gray-50">
            <p className="text-2xl">🛍️</p>
            <p className="mt-2 font-medium">Become a Seller</p>
          </Link>
        )}
      </div>
    </div>
  );
}
