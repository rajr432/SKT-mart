"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Order } from "@/lib/types";

type StepKey = "PLACED" | "CONFIRMED" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";
type Step = { key: StepKey; label: string; icon: StepIconName };

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const { order } = await api<{ order: Order }>(`/api/orders/${params.id}`, { token });
        setOrder(order);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, token, params.id]);

  if (loading) return <div className="container-page py-8">Loading…</div>;
  if (!order) return <div className="container-page py-8">Order not found</div>;

  const statuses: Step[] = [
    { key: "PLACED", label: "Placed", icon: "doc" },
    { key: "CONFIRMED", label: "Confirmed", icon: "check" },
    { key: "PACKED", label: "Packed", icon: "box" },
    { key: "SHIPPED", label: "Shipped", icon: "truck" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "route" },
    { key: "DELIVERED", label: "Delivered", icon: "home" },
  ];
  const idx = statuses.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "CANCELLED";

  // ETA = placedAt + 5 days if not delivered yet
  const eta = new Date(new Date(order.placedAt).getTime() + 5 * 86400_000);
  const etaText =
    idx >= 5
      ? "Delivered"
      : isCancelled
      ? "—"
      : eta.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const paid = order.paymentStatus === "PAID";

  return (
    <div className="container-page py-6 space-y-4">
      <div className="card-premium p-5">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Order</p>
            <h1 className="font-display text-xl tracking-tightest">{order.orderNumber}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Placed on {new Date(order.placedAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              Expected delivery: <span className="font-medium tracking-tight">{etaText}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl tracking-tightest">{formatPaise(order.total)}</p>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">
              {order.paymentMethod}
              <span className="mx-1.5 text-gray-300">·</span>
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  paid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {order.paymentStatus}
              </span>
            </p>
          </div>
        </div>

        {isCancelled ? (
          <div className="mt-5 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm">
            <div className="font-medium tracking-tight">Order cancelled</div>
            <div className="text-xs mt-1 opacity-80">
              Refund has been credited to your wallet (if payment was captured).
            </div>
          </div>
        ) : (
          <>
            {/* Desktop: horizontal tracker */}
            <div className="hidden md:block mt-7">
              <div className="relative flex justify-between">
                <div className="absolute top-5 left-8 right-8 h-[3px] bg-gray-100 rounded-full" />
                <div
                  className="absolute top-5 left-8 h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 rounded-full transition-all duration-700"
                  style={{
                    width: `calc(${
                      idx === 0 ? 0 : (idx / (statuses.length - 1)) * 100
                    }% - ${idx === 0 ? 0 : 16}px)`,
                  }}
                />
                {statuses.map((s, i) => (
                  <div key={s.key} className="relative flex flex-col items-center flex-1 z-10">
                    <div
                      className={`h-10 w-10 rounded-full grid place-items-center transition-all ${
                        i <= idx
                          ? "bg-accent text-white shadow-soft"
                          : "bg-white text-gray-300 border-2 border-gray-100"
                      } ${i === idx ? "ring-4 ring-accent/15" : ""}`}
                    >
                      {i < idx ? <CheckSvg /> : <StepIcon name={s.icon} />}
                    </div>
                    <div
                      className={`mt-2 text-[11px] text-center tracking-wide ${
                        i <= idx
                          ? "font-medium text-gray-800"
                          : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden mt-5">
              {statuses.map((s, i) => (
                <div key={s.key} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-9 w-9 rounded-full grid place-items-center ${
                        i <= idx
                          ? "bg-accent text-white shadow-soft"
                          : "bg-white text-gray-300 border-2 border-gray-100"
                      } ${i === idx ? "ring-2 ring-accent/20" : ""}`}
                    >
                      {i < idx ? <CheckSvg /> : <StepIcon name={s.icon} />}
                    </div>
                    {i < statuses.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-5 ${
                          i < idx ? "bg-accent" : "bg-gray-100"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div
                      className={`text-sm tracking-tight ${
                        i <= idx ? "font-medium text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </div>
                    {i === idx && (
                      <div className="text-[11px] text-accent mt-0.5 uppercase tracking-wider">
                        Current status
                      </div>
                    )}
                    {i < idx && (
                      <div className="text-[11px] text-emerald-600 mt-0.5 uppercase tracking-wider">
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Ship to</p>
          <h3 className="font-display text-base tracking-tight mb-3">Shipping address</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-medium tracking-tight text-gray-900">{order.address.name}</span>
            <span className="text-gray-400"> · {order.address.phone}</span>
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
            <br />
            {order.address.city}, {order.address.state} — {order.address.pincode}
          </p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Receipt</p>
          <h3 className="font-display text-base tracking-tight mb-3">Price details</h3>
          <div className="space-y-1.5">
            <Row label="Subtotal" value={formatPaise(order.subtotal)} />
            <Row label="Discount" value={`− ${formatPaise(order.discount)}`} accent />
            <Row
              label="Shipping"
              value={order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)}
            />
          </div>
          <div className="border-t border-gray-100 my-3" />
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Total</span>
            <span className="font-display text-xl tracking-tightest">
              {formatPaise(order.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Items</p>
            <h3 className="font-display text-base tracking-tight">
              {order.items.length} item{order.items.length === 1 ? "" : "s"} ordered
            </h3>
          </div>
          <div className="flex gap-2">
            <a
              href={`${
                process.env.NEXT_PUBLIC_API_URL || "https://skt-mart-api.onrender.com"
              }/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-100 px-3 py-1.5 rounded-full hover:border-accent/40 hover:text-accent"
            >
              Invoice
            </a>
            <button
              onClick={async () => {
                try {
                  for (const it of order.items) {
                    await api("/api/cart", {
                      token: token!,
                      method: "POST",
                      json: { productId: it.productId, quantity: it.quantity },
                    });
                  }
                  router.push("/cart");
                } catch (e) {
                  alert((e as Error).message);
                }
              }}
              className="text-[11px] uppercase tracking-wider bg-accent text-white px-3 py-1.5 rounded-full shadow-soft hover:bg-accent-dark"
            >
              Reorder all
            </button>
          </div>
        </div>
        <ul className="divide-y divide-gray-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between items-start text-sm py-3">
              <div className="min-w-0 pr-3">
                <p className="font-medium tracking-tight truncate">{it.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Qty: {it.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium tracking-tight">
                  {formatPaise(it.price * it.quantity)}
                </p>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  {it.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={accent ? "text-emerald-600 font-medium" : "text-gray-800"}>{value}</span>
    </div>
  );
}

type StepIconName = "doc" | "check" | "box" | "truck" | "route" | "home";

function StepIcon({ name }: { name: StepIconName }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[16px] w-[16px]",
  };
  if (name === "doc")
    return (
      <svg {...c}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...c}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.5 2.5L16 9.5" />
      </svg>
    );
  if (name === "box")
    return (
      <svg {...c}>
        <path d="m3 7 9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    );
  if (name === "truck")
    return (
      <svg {...c}>
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="1.7" />
        <circle cx="17" cy="18" r="1.7" />
      </svg>
    );
  if (name === "route")
    return (
      <svg {...c}>
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h8a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h8" />
      </svg>
    );
  return (
    <svg {...c}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function CheckSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[16px] w-[16px]"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}
