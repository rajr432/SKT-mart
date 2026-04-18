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
      <h1 className="text-xl font-semibold mb-4">My Wishlist ({items.length})</h1>
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
