"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, formatPaise } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface BundleProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
  images: { url: string }[];
}
interface Bundle {
  id: string;
  title: string;
  discount: number;
  items: { id: string; product: BundleProduct }[];
}

// PDP "Frequently bought together" — shows admin-curated bundles that
// include the current product. Combo discount (% off) is applied on the
// subtotal of selected items so the buyer can add all of them to cart.
export default function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { token } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const r = await api<{ items: Bundle[] }>(`/api/bundles/for-product/${productId}`);
      setBundles(r.items);
      // default: all items selected
      const sel: Record<string, Set<string>> = {};
      for (const b of r.items) {
        sel[b.id] = new Set(b.items.map((i) => i.product.id));
      }
      setSelected(sel);
    })().catch(() => setBundles([]));
  }, [productId]);

  const toggle = (bundleId: string, pid: string) => {
    setSelected((curr) => {
      const next = { ...curr };
      const s = new Set(next[bundleId] ?? []);
      if (s.has(pid)) s.delete(pid);
      else s.add(pid);
      next[bundleId] = s;
      return next;
    });
  };

  const addAll = async (b: Bundle) => {
    if (!token) return alert("Login to add to cart");
    const sel = selected[b.id] ?? new Set();
    if (sel.size < 1) return;
    setMsg("");
    setAdding(true);
    try {
      for (const it of b.items) {
        if (!sel.has(it.product.id)) continue;
        if (it.product.stock <= 0) continue;
        await api("/api/cart", {
          token,
          method: "POST",
          json: { productId: it.product.id, quantity: 1 },
        });
      }
      setMsg(`Added ${sel.size} item${sel.size === 1 ? "" : "s"} to cart`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  if (!bundles.length) return null;

  return (
    <div className="card p-4 space-y-3">
      <h2 className="text-lg font-semibold">Frequently bought together</h2>
      {bundles.map((b) => {
        const sel = selected[b.id] ?? new Set();
        const subtotal = b.items
          .filter((i) => sel.has(i.product.id))
          .reduce((s, i) => s + i.product.price, 0);
        const discounted = Math.round(subtotal * (1 - b.discount / 100));
        return (
          <div key={b.id} className="border-t pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">{b.title}</span> ·{" "}
              <span className="text-brand-green">{b.discount}% off combo</span>
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {b.items.map((i, idx) => (
                <div key={i.id} className="min-w-[120px]">
                  <label className="flex items-start gap-1">
                    <input
                      type="checkbox"
                      checked={sel.has(i.product.id)}
                      onChange={() => toggle(b.id, i.product.id)}
                      className="mt-1"
                    />
                    <Link href={`/product/${i.product.slug}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={i.product.images[0]?.url ?? "/logo.jpg"}
                        alt={i.product.name}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <p className="text-xs line-clamp-2 mt-1">{i.product.name}</p>
                      <p className="text-xs font-semibold">{formatPaise(i.product.price)}</p>
                      {i.product.stock <= 0 && (
                        <p className="text-[10px] text-red-600">Out of stock</p>
                      )}
                    </Link>
                  </label>
                  {idx < b.items.length - 1 && <div className="hidden">+</div>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-sm">
                {subtotal !== discounted && (
                  <span className="line-through text-gray-400 mr-2">
                    {formatPaise(subtotal)}
                  </span>
                )}
                <span className="font-semibold">{formatPaise(discounted)}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({sel.size} selected)
                </span>
              </div>
              <button
                onClick={() => addAll(b)}
                disabled={adding || sel.size === 0}
                className="btn-primary text-sm"
              >
                {adding ? "Adding…" : "Add all to cart"}
              </button>
            </div>
            {msg && <p className="text-xs text-green-600 mt-1">{msg}</p>}
          </div>
        );
      })}
    </div>
  );
}
