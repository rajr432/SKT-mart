"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, discountPercent, formatPaise } from "@/lib/api";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/cart");
      return;
    }
    load();
  }, [ready, token]);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await api<{ items: CartItem[] }>("/api/cart", { token });
      setItems(items);
    } finally {
      setLoading(false);
    }
  };

  const setQty = async (id: string, q: number) => {
    await api(`/api/cart/${id}`, { token, method: "PATCH", json: { quantity: q } });
    load();
  };

  const remove = async (id: string) => {
    await api(`/api/cart/${id}`, { token, method: "DELETE" });
    load();
  };

  if (loading) return <div className="container-page py-8">Loading…</div>;

  if (items.length === 0) {
    return (
      <div className="container-page py-8">
        <div className="card p-10 text-center">
          <p className="text-lg">Your cart is empty</p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
  const selling = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount = subtotal - selling;
  const shipping = selling >= 49900 ? 0 : 4900;
  const total = selling + shipping;

  return (
    <div className="container-page py-6 grid md:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        {items.map((ci) => {
          const img = ci.product.images?.[0]?.url;
          return (
            <div key={ci.id} className="card p-4 flex gap-4">
              {img && <img src={img} alt="" className="h-24 w-24 object-contain" />}
              <div className="flex-1">
                <Link href={`/product/${ci.product.slug}`} className="font-medium">
                  {ci.product.name}
                </Link>
                <p className="text-sm text-gray-500">Seller: {ci.product.vendor?.storeName}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-semibold">{formatPaise(ci.product.price)}</span>
                  <span className="text-xs text-gray-500 line-through">
                    {formatPaise(ci.product.mrp)}
                  </span>
                  <span className="text-xs text-brand-green">
                    {discountPercent(ci.product.mrp, ci.product.price)}% off
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border">
                    <button
                      className="w-8 h-8"
                      onClick={() => setQty(ci.id, Math.max(0, ci.quantity - 1))}
                    >
                      −
                    </button>
                    <span className="w-10 text-center">{ci.quantity}</span>
                    <button className="w-8 h-8" onClick={() => setQty(ci.id, ci.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(ci.id)}
                    className="text-sm uppercase font-medium text-gray-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="space-y-3">
        <div className="card p-4 text-sm sticky top-20">
          <h3 className="text-gray-500 uppercase text-xs mb-3">Price Details</h3>
          <Row label={`Price (${items.length} items)`} value={formatPaise(subtotal)} />
          <Row label="Discount" value={`− ${formatPaise(discount)}`} highlight="green" />
          <Row
            label="Delivery"
            value={shipping === 0 ? "Free" : formatPaise(shipping)}
            highlight={shipping === 0 ? "green" : undefined}
          />
          <div className="border-t my-2" />
          <Row label="Total Amount" value={formatPaise(total)} bold />
          <p className="text-brand-green text-xs mt-2">You will save {formatPaise(discount)}</p>
          <Link href="/checkout" className="btn-yellow w-full mt-4">
            Place Order
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: string;
  highlight?: "green";
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={highlight === "green" ? "text-brand-green" : ""}>{value}</span>
    </div>
  );
}
