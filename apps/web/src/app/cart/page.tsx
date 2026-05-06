"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, discountPercent, formatPaise } from "@/lib/api";
import type { CartItem } from "@/lib/types";
import FreeShippingBar from "@/components/FreeShippingBar";

export default function CartPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingFee, setShippingFee] = useState(4000);
  const [freeShippingMin, setFreeShippingMin] = useState(50000);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/cart");
      return;
    }
    load();
    api<{ shippingFee?: number; freeShippingMin?: number }>("/api/settings/public")
      .then((s) => {
        if (typeof s.shippingFee === "number") setShippingFee(s.shippingFee);
        if (typeof s.freeShippingMin === "number") setFreeShippingMin(s.freeShippingMin);
      })
      .catch(() => {});
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

  if (loading) {
    return (
      <div className="container-page py-8 space-y-3">
        <div className="h-24 rounded-3xl bg-gray-100 animate-pulse" />
        <div className="h-24 rounded-3xl bg-gray-100 animate-pulse" />
        <div className="h-24 rounded-3xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 mx-auto mb-6 grid place-items-center text-accent">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">Your cart is empty</h2>
          <p className="text-ink-muted text-sm mt-2">
            Add products you love and they&apos;ll appear here.
          </p>
          <Link
            href="/"
            className="btn-pill bg-accent text-white hover:bg-accent-dark mt-6 inline-block shadow-glow"
          >
            Start shopping →
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
  const selling = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discount = subtotal - selling;
  const shipping = selling >= freeShippingMin ? 0 : shippingFee;
  const total = selling + shipping;

  return (
    <div className="container-page py-6 grid md:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          Your bag <span className="text-ink-muted text-base font-normal">· {items.length} items</span>
        </h1>
        <FreeShippingBar />
        {items.map((ci) => {
          const img = ci.product.images?.[0]?.url;
          const off = discountPercent(ci.product.mrp, ci.product.price);
          return (
            <div
              key={ci.id}
              className="card-premium p-3 sm:p-4 flex gap-3 sm:gap-4"
            >
              <Link
                href={`/product/${ci.product.slug}`}
                className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl bg-gradient-to-br from-gray-50 to-purple-50/40 overflow-hidden grid place-items-center"
              >
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={ci.product.name} className="max-h-full max-w-full object-contain p-2" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${ci.product.slug}`}
                  className="font-medium text-ink line-clamp-2 hover:text-accent transition"
                >
                  {ci.product.name}
                </Link>
                <p className="text-xs text-ink-muted mt-0.5">
                  {ci.product.vendor?.storeName}
                </p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-semibold text-ink">
                    {formatPaise(ci.product.price)}
                  </span>
                  {off > 0 && (
                    <>
                      <span className="text-xs text-ink-muted line-through">
                        {formatPaise(ci.product.mrp)}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">
                        {off}% off
                      </span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
                    <button
                      className="h-7 w-7 grid place-items-center rounded-full bg-white text-ink-soft hover:bg-accent hover:text-white transition shadow-sm"
                      onClick={() => setQty(ci.id, Math.max(0, ci.quantity - 1))}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-medium text-ink">
                      {ci.quantity}
                    </span>
                    <button
                      className="h-7 w-7 grid place-items-center rounded-full bg-white text-ink-soft hover:bg-accent hover:text-white transition shadow-sm"
                      onClick={() => setQty(ci.id, ci.quantity + 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(ci.id)}
                    className="text-xs font-medium text-ink-muted hover:text-rose-600 transition"
                  >
                    Remove
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api("/api/wishlist", {
                          token,
                          method: "POST",
                          json: { productId: ci.product.id },
                        });
                        await remove(ci.id);
                      } catch (e) {
                        alert((e as Error).message);
                      }
                    }}
                    className="text-xs font-medium text-accent hover:text-accent-dark transition"
                  >
                    Save for later
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="space-y-3">
        <div className="card-premium p-5 text-sm sticky top-20">
          <h3 className="font-display text-ink-muted uppercase text-[11px] tracking-widest mb-4">
            Order summary
          </h3>
          <Row label={`Items (${items.length})`} value={formatPaise(subtotal)} />
          {discount > 0 && (
            <Row
              label="Discount"
              value={`− ${formatPaise(discount)}`}
              highlight="green"
            />
          )}
          <Row
            label="Delivery"
            value={shipping === 0 ? "Free" : formatPaise(shipping)}
            highlight={shipping === 0 ? "green" : undefined}
          />
          <div className="border-t border-gray-100 my-3" />
          <Row label="Total" value={formatPaise(total)} bold />
          {discount > 0 && (
            <p className="text-emerald-600 text-xs mt-2 font-medium">
              You save {formatPaise(discount)}
            </p>
          )}
          <Link
            href="/checkout"
            className="btn-pill bg-accent text-white hover:bg-accent-dark w-full mt-5 shadow-glow text-base py-3"
          >
            Proceed to checkout →
          </Link>
          <p className="text-[10px] text-ink-muted text-center mt-3 flex items-center justify-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secured by Razorpay · 100% safe
          </p>
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
    <div className={`flex justify-between py-1 ${bold ? "text-base font-bold text-ink" : "text-ink-soft"}`}>
      <span>{label}</span>
      <span className={highlight === "green" ? "text-emerald-600 font-medium" : ""}>{value}</span>
    </div>
  );
}
