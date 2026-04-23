"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, formatPaise } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface Item {
  viewedAt: string;
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    images: { url: string }[];
  };
}

// Recently viewed surface for homepage + account. Server-backed (per user)
// via /api/recently-viewed. Tracking happens inside ProductActions on PDP.
// Guest users see nothing here — the guest ring buffer in localStorage is
// used only to seed server state on login, not to fetch products by id
// (PDP endpoint is slug-keyed, not id-keyed).
export default function RecentlyViewed() {
  const { token, ready } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ items: Item[] }>("/api/recently-viewed", { token })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [ready, token]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-3">Recently viewed</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((i) => (
          <Link
            key={i.product.id}
            href={`/product/${i.product.slug}`}
            className="min-w-[120px] shrink-0 block hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={i.product.images[0]?.url ?? "/logo.jpg"}
              alt={i.product.name}
              className="w-24 h-24 md:w-28 md:h-28 object-cover rounded border"
            />
            <p className="text-xs line-clamp-2 mt-1">{i.product.name}</p>
            <p className="text-xs font-semibold">{formatPaise(i.product.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
