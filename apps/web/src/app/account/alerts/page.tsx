"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatPaise } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

interface Alert {
  id: string;
  productId: string;
  targetPrice?: number;
  notified: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    images: { url: string }[];
  };
}

export default function AlertsPage() {
  const { token } = useAuth();
  const [price, setPrice] = useState<Alert[]>([]);
  const [stock, setStock] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<{ price: Alert[]; stock: Alert[] }>("/api/alerts/mine", { token })
      .then((r) => {
        setPrice(r.price);
        setStock(r.stock);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div className="container-page py-10 text-center">
        <div className="card p-8">
          <h1 className="text-xl font-semibold mb-2">Log in to view alerts</h1>
          <Link href="/login" className="btn-primary inline-block">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-5 space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold">My alerts</h1>
        <p className="text-sm text-gray-600">
          We'll email + push you the moment a price drops or a product is restocked.
        </p>
      </div>

      {loading && (
        <div className="card p-10 text-center text-gray-500">Loading…</div>
      )}

      {!loading && price.length === 0 && stock.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-700 mb-2">No alerts yet.</p>
          <p className="text-sm text-gray-500">
            Visit a product page and tap "Price drop alert" or "Notify when in stock".
          </p>
        </div>
      )}

      {price.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">🔔 Price drop alerts ({price.length})</h2>
          <div className="divide-y">
            {price.map((a) => (
              <Link
                key={a.id}
                href={`/product/${a.product.slug}`}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded px-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.product.images[0]?.url ?? ""}
                  alt={a.product.name}
                  className="w-14 h-14 object-contain rounded border bg-gray-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{a.product.name}</p>
                  <p className="text-xs text-gray-600">
                    Now {formatPaise(a.product.price)} · Target{" "}
                    <b>{a.targetPrice ? formatPaise(a.targetPrice) : "-"}</b>
                  </p>
                </div>
                {a.product.price <= (a.targetPrice ?? 0) && (
                  <span className="text-xs bg-brand-green text-white rounded px-2 py-0.5">
                    Hit!
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {stock.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">📦 Back-in-stock alerts ({stock.length})</h2>
          <div className="divide-y">
            {stock.map((a) => (
              <Link
                key={a.id}
                href={`/product/${a.product.slug}`}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded px-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.product.images[0]?.url ?? ""}
                  alt={a.product.name}
                  className="w-14 h-14 object-contain rounded border bg-gray-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{a.product.name}</p>
                  <p className="text-xs text-gray-600">
                    Stock: <b>{a.product.stock}</b>
                  </p>
                </div>
                {a.product.stock > 0 && (
                  <span className="text-xs bg-brand-green text-white rounded px-2 py-0.5">
                    In stock
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
