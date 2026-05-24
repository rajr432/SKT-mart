"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface TrackStep {
  status: string;
  at: string | null;
  done: boolean;
}

interface TrackResult {
  orderNumber: string;
  status: string;
  total?: number;
  createdAt: string;
  expectedBy: string | null;
  steps: TrackStep[];
}

type StepKey =
  | "PLACED"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "PLACED", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export default function TrackOrderPage() {
  const { token } = useAuth();
  const [orderNumber, setOrderNumber] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!orderNumber.trim()) return;
    setLoading(true);
    try {
      const r = await api<{ order: TrackResult }>(
        `/api/orders/track/${encodeURIComponent(orderNumber.trim())}`,
        { token },
      );
      setResult(r.order);
    } catch (e) {
      setErr((e as Error).message || "Order not found");
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = result ? STEPS.findIndex((s) => s.key === result.status) : -1;

  return (
    <div className="container-page py-6 space-y-5 max-w-3xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl text-white p-7 sm:p-9 shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500" />
        <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Live updates</p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mt-1">
            Track your order
          </h1>
          <p className="opacity-90 mt-2 text-sm max-w-xl">
            Enter your order number for real-time status, or view all your shipments from{" "}
            <Link href="/orders" className="underline underline-offset-4 font-semibold">
              My Orders
            </Link>
            .
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="card-premium p-2 flex gap-2 items-center">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Order number (e.g. SKT-2025-12345)"
          className="flex-1 bg-transparent rounded-2xl px-4 py-3 outline-none text-sm placeholder:text-gray-400"
        />
        <button className="btn-primary btn-pill" disabled={loading}>
          {loading ? "Tracking…" : "Track"}
        </button>
      </form>

      {err && (
        <div className="card-premium p-4 border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}

      {result && (
        <div className="card-premium p-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
                Order number
              </p>
              <p className="font-mono font-semibold tracking-tight mt-0.5">
                {result.orderNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Status</p>
              <p className="font-display tracking-tight mt-0.5">
                {result.status.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {result.expectedBy && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-800 text-sm p-4">
              <span className="text-[10px] uppercase tracking-[0.22em] text-violet-500">
                Expected delivery
              </span>
              <p className="font-display text-lg tracking-tight mt-0.5">
                {new Date(result.expectedBy).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          )}

          {/* Horizontal timeline (desktop) */}
          <div className="hidden md:flex items-start justify-between relative pt-4">
            <div className="absolute top-[26px] left-8 right-8 h-1 bg-gray-100 rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400 transition-all"
                style={{
                  width:
                    currentIdx >= 0
                      ? `${(currentIdx / (STEPS.length - 1)) * 100}%`
                      : "0%",
                }}
              />
            </div>
            {STEPS.map((s, i) => {
              const done = currentIdx >= i;
              const active = currentIdx === i;
              return (
                <div key={s.key} className="relative z-10 text-center w-1/6 px-1">
                  <div
                    className={`mx-auto h-12 w-12 rounded-full grid place-items-center transition shadow-soft ${
                      done
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                        : "bg-white text-gray-300 ring-1 ring-gray-200"
                    } ${active ? "ring-4 ring-accent/30" : ""}`}
                  >
                    <StepIcon stepKey={s.key} />
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      done ? "font-semibold tracking-tight" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Vertical timeline (mobile) */}
          <div className="md:hidden space-y-3">
            {STEPS.map((s, i) => {
              const done = currentIdx >= i;
              const active = currentIdx === i;
              return (
                <div key={s.key} className="flex items-start gap-3">
                  <div className="relative">
                    <div
                      className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${
                        done
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                          : "bg-white text-gray-300 ring-1 ring-gray-200"
                      } ${active ? "ring-4 ring-accent/30" : ""}`}
                    >
                      <StepIcon stepKey={s.key} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-10 -translate-x-1/2 w-0.5 h-6 ${
                          currentIdx > i
                            ? "bg-gradient-to-b from-fuchsia-500 to-violet-500"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p
                      className={`text-sm ${
                        done ? "font-semibold tracking-tight" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </p>
                    {done && i === currentIdx && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(result.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIcon({ stepKey }: { stepKey: StepKey }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px]",
  };
  switch (stepKey) {
    case "PLACED":
      return (
        <svg {...c}>
          <path d="M5 4h11l3 3v13H5V4Z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "CONFIRMED":
      return (
        <svg {...c}>
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    case "PACKED":
      return (
        <svg {...c}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5" />
        </svg>
      );
    case "SHIPPED":
      return (
        <svg {...c}>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <svg {...c}>
          <circle cx="6" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M8 17h7l1.5-5h2L20 9h-3l-1-3h-5l-1 3H7l-1 4h2" />
        </svg>
      );
    case "DELIVERED":
      return (
        <svg {...c}>
          <path d="M3 11l9-7 9 7v9H3v-9Z" />
          <path d="M9 20v-5h6v5" />
        </svg>
      );
  }
}
