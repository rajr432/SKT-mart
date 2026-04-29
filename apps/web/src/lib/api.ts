const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiOptions extends RequestInit {
  token?: string | null;
  json?: unknown;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { token, json, headers, cache, next, ...rest } = opts as ApiOptions & {
    next?: { revalidate?: number; tags?: string[] };
  };
  const h: Record<string, string> = { ...(headers as Record<string, string>) };
  if (json !== undefined) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;

  // Default ISR: 120s for unauthenticated GETs (was 60). The longer window means
  // an upstream API cold start (Render free tier) only blocks 1 visitor every
  // 2 min instead of every minute — perceived latency drops sharply.
  // Mutations + authed reads still bypass cache.
  const method = (rest.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";
  const fetchInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    ...rest,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  };
  if (isMutation || token) {
    fetchInit.cache = cache ?? "no-store";
  } else if (cache) {
    fetchInit.cache = cache;
  } else {
    fetchInit.next = next ?? { revalidate: 120 };
  }

  const res = await fetch(`${BASE}${path}`, fetchInit);
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = typeof data === "object" && data && "error" in data ? (data as any).error : res.statusText;
    throw new Error(String(msg));
  }
  return data as T;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
