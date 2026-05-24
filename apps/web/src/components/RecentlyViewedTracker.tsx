"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";

// Fires once per mount to record that the user viewed this product. Mounted
// inside the PDP server component so it runs on every product navigation.
// - Server tracking (optional auth): POST /api/recently-viewed dedupes per
//   (userId, productId) and refreshes viewedAt, so repeat views don't bloat
//   the table. Guest calls are no-ops on the server.
// - Client ring buffer (max 12 ids) powers a lightweight guest experience
//   in other surfaces that can lookup by slug; we don't render it directly
//   in RecentlyViewed (which is server-backed per user) to avoid showing
//   stale data after login.
export default function RecentlyViewedTracker({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { token, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    try {
      const raw = localStorage.getItem("recently_viewed_slugs");
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [productSlug, ...list.filter((s) => s !== productSlug)].slice(0, 12);
      localStorage.setItem("recently_viewed_slugs", JSON.stringify(next));
    } catch {
      /* localStorage may be blocked; ignore */
    }
    api("/api/recently-viewed", {
      token: token ?? undefined,
      method: "POST",
      json: { productId },
    }).catch(() => {});
  }, [ready, token, productId, productSlug]);

  return null;
}
