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
    <div className="container-page py-6 space-y-5">
      <div className="card-premium p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Saved</p>
          <h1 className="font-display text-xl tracking-tightest">
            My wishlist{" "}
            <span className="text-gray-300 font-sans text-base font-normal">· {items.length}</span>
          </h1>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
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
                      `${r.moved} item${r.moved === 1 ? "" : "s"} moved to cart${
                        r.skipped ? ` · ${r.skipped} skipped (out of stock)` : ""
                      }`,
                    );
                    router.push("/cart");
                  }
                } catch (e) {
                  alert((e as Error).message);
                }
              }}
              className="text-[11px] uppercase tracking-wider bg-accent text-white px-3.5 py-2 rounded-full shadow-soft hover:bg-accent-dark"
            >
              Move all to cart
            </button>
            <button
              onClick={async () => {
                const text = items
                  .slice(0, 20)
                  .map(
                    (i) =>
                      `• ${i.product.name} — ${formatPaise(i.product.price)} — ${
                        window.location.origin
                      }/product/${i.product.slug}`,
                  )
                  .join("\n");
                const msg = `My SKT Mart wishlist:\n\n${text}`;
                if (typeof navigator !== "undefined" && "share" in navigator) {
                  try {
                    await (
                      navigator as Navigator & {
                        share: (d: { title: string; text: string }) => Promise<void>;
                      }
                    ).share({
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
              className="text-[11px] uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-100 px-3.5 py-2 rounded-full hover:border-accent/40 hover:text-accent"
            >
              Share
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-7 w-7 text-accent"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h3 className="font-display text-lg tracking-tightest">Your wishlist is empty</h3>
          <p className="text-sm text-gray-500 mt-1">
            Tap the heart on any product to save it here.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-soft"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            return (
              <div key={it.id} className="card-premium p-3 flex flex-col">
                <Link href={`/product/${it.product.slug}`} className="block">
                  <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-gradient-to-br from-violet-50/60 to-fuchsia-50/40">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain p-2"
                      />
                    )}
                  </div>
                  <p className="text-sm mt-3 line-clamp-2 tracking-tight">
                    {it.product.name}
                  </p>
                  <p className="font-display text-base tracking-tight mt-1">
                    {formatPaise(it.product.price)}
                  </p>
                </Link>
                <button
                  onClick={() => remove(it.productId)}
                  className="text-[11px] uppercase tracking-wider w-full mt-3 bg-gray-50 text-gray-700 border border-gray-100 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/40 py-1.5 rounded-full transition"
                >
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
