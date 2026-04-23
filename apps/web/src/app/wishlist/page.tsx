"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Product } from "@/lib/types";

interface Item {
  id: string;
  productId: string;
  product: Product;
}

export default function WishlistPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/wishlist");
      return;
    }
    load();
  }, [ready, token]);

  const load = async () => {
    setLoading(true);
    const { items } = await api<{ items: Item[] }>("/api/wishlist", { token });
    setItems(items);
    setLoading(false);
  };

  const remove = async (productId: string) => {
    await api(`/api/wishlist/${productId}`, { token, method: "DELETE" });
    load();
  };

  if (loading) return <div className="container-page py-8">Loading…</div>;

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">My Wishlist ({items.length})</h1>
        <div className="flex items-center gap-2 flex-wrap">
        {items.length > 0 && (
          <button
            onClick={async () => {
              try {
                const r = await api<{ moved: number; skipped: number }>(
                  "/api/wishlist/move-to-cart",
                  { token, method: "POST" },
                );
                if (r.moved === 0) {
                  alert("Nothing to move — items are out of stock or unavailable.");
                } else {
                  alert(
                    `${r.moved} item${r.moved === 1 ? "" : "s"} moved to cart${r.skipped ? ` · ${r.skipped} skipped (out of stock)` : ""}`,
                  );
                  router.push("/cart");
                }
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="text-sm bg-brand-yellow text-white px-3 py-1.5 rounded-md"
          >
            🛒 Move all to cart
          </button>
        )}
        {items.length > 0 && (
          <button
            onClick={async () => {
              const text = items
                .slice(0, 20)
                .map((i) => `• ${i.product.name} — ${formatPaise(i.product.price)} — ${window.location.origin}/product/${i.product.slug}`)
                .join("\n");
              const msg = `My SKT Mart wishlist:\n\n${text}`;
              if (typeof navigator !== "undefined" && "share" in navigator) {
                try {
                  await (navigator as Navigator & { share: (d: { title: string; text: string }) => Promise<void> }).share({
                    title: "My SKT Mart Wishlist",
                    text: msg,
                  });
                  return;
                } catch {
                  /* cancelled */
                }
              }
              try {
                await navigator.clipboard.writeText(msg);
                alert("Wishlist copied to clipboard!");
              } catch {
                alert(msg);
              }
            }}
            className="text-sm bg-brand text-white px-3 py-1.5 rounded-md"
          >
            ↗ Share wishlist
          </button>
        )}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p>Your wishlist is empty.</p>
          <Link href="/" className="btn-primary mt-3 inline-block">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            return (
              <div key={it.id} className="card p-3">
                <Link href={`/product/${it.product.slug}`}>
                  {img && <img src={img} alt="" className="h-40 w-full object-contain" />}
                  <p className="text-sm mt-2 line-clamp-2">{it.product.name}</p>
                  <p className="font-semibold mt-1">{formatPaise(it.product.price)}</p>
                </Link>
                <button onClick={() => remove(it.productId)} className="btn-outline w-full mt-2 text-xs">
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
