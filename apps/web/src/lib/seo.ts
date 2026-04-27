import type { Metadata } from "next";
import { api } from "@/lib/api";

export type SeoEntry = { title?: string; description?: string; ogImage?: string };

const DEFAULTS: Record<string, SeoEntry> = {
  home: {
    title: "SKT Mart — Online shopping for electronics, fashion, home & more",
    description:
      "Shop mobiles, laptops, fashion, home essentials & more at the lowest prices. Free delivery, 7-day returns, secure payments.",
  },
  search: { title: "Search | SKT Mart" },
  categories: { title: "All categories | SKT Mart" },
  deals: { title: "Today's deals | SKT Mart" },
  brands: { title: "All brands | SKT Mart" },
  track: { title: "Track your order | SKT Mart" },
};

// Reads admin-edited SEO map from /api/site-content (key="seo") and merges
// with sensible defaults. Falls back silently on network errors so a flaky
// API never blanks out page <title>.
export async function getPageSeo(pageKey: string): Promise<Metadata> {
  let admin: SeoEntry = {};
  try {
    const { content } = await api<{
      content: { seo?: Record<string, SeoEntry> };
    }>("/api/site-content");
    admin = content?.seo?.[pageKey] ?? {};
  } catch {
    /* ignore */
  }
  const def = DEFAULTS[pageKey] ?? {};
  const title = admin.title?.trim() || def.title;
  const description = admin.description?.trim() || def.description;
  const ogImage = admin.ogImage?.trim() || undefined;
  const meta: Metadata = {};
  if (title) meta.title = title;
  if (description) meta.description = description;
  if (title || description || ogImage) {
    meta.openGraph = {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    };
    meta.twitter = {
      card: ogImage ? "summary_large_image" : "summary",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    };
  }
  return meta;
}
