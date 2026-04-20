"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  verified: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string }>;
  };
}

export default function MyReviewsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<{ items: MyReview[] }>("/api/reviews/mine", { token })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [token]);

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await api(`/api/reviews/${id}`, { token, method: "DELETE" });
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Reviews ({items.length})</h1>
        {items.length > 0 && (
          <p className="text-xs text-gray-500">
            Average ★{" "}
            {(items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1)} across your
            reviews
          </p>
        )}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-600">
          You haven&apos;t reviewed anything yet. Rate a product from your{" "}
          <Link href="/orders" className="text-brand underline">
            order history
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const img = r.product.images[0]?.url ?? "/placeholder.png";
            return (
              <div key={r.id} className="card p-4 flex gap-3">
                <Link
                  href={`/product/${r.product.slug}`}
                  className="shrink-0 w-20 h-20 rounded overflow-hidden bg-gray-100 grid place-items-center"
                >
                  <Image
                    src={img}
                    alt={r.product.name}
                    width={80}
                    height={80}
                    className="object-cover"
                    unoptimized
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${r.product.slug}`}
                      className="font-medium text-sm line-clamp-1 hover:text-brand"
                    >
                      {r.product.name}
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-xs text-red-600 hover:underline shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-brand-green text-white text-xs rounded px-2 py-0.5 font-semibold">
                      ★ {r.rating}
                    </span>
                    {r.verified && (
                      <span className="text-[10px] text-brand-green font-semibold">
                        ✓ Verified purchase
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 ml-auto">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.title && <p className="font-semibold text-sm mt-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                  {r.images.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {r.images.slice(0, 4).map((url, i) => (
                        <Image
                          key={i}
                          src={url}
                          alt=""
                          width={48}
                          height={48}
                          className="rounded object-cover w-12 h-12"
                          unoptimized
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
