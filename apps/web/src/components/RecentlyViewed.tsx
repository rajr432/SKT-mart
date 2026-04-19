"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function RecentlyViewed() {
  const { token, ready } = useAuth();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!ready || !token) return;
    // Endpoint returns RecentlyViewed rows with `.product` nested; unwrap.
    api<{ items: Array<{ product: Product }> }>("/api/recently-viewed", { token })
      .then((r) =>
        setItems(
          (r.items ?? [])
            .map((i) => i.product)
            .filter((p): p is Product => !!p)
            .slice(0, 10),
        ),
      )
      .catch(() => {});
  }, [ready, token]);

  if (!token || items.length === 0) return null;
  return (
    <section className="card p-4">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <span>👀</span> Recently viewed
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {items.map((p) => (
          <div key={p.id} className="min-w-[170px] max-w-[170px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
