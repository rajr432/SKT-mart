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

const STEPS: Array<{ key: string; label: string; icon: string }> = [
  { key: "PLACED", label: "Placed", icon: "📝" },
  { key: "CONFIRMED", label: "Confirmed", icon: "✅" },
  { key: "PACKED", label: "Packed", icon: "📦" },
  { key: "SHIPPED", label: "Shipped", icon: "🚚" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: "🛵" },
  { key: "DELIVERED", label: "Delivered", icon: "🏠" },
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

  const currentIdx = result
    ? STEPS.findIndex((s) => s.key === result.status)
    : -1;

  return (
    <div className="container-page py-6 space-y-4 max-w-3xl mx-auto">
      <section className="card p-6 bg-gradient-to-br from-brand to-blue-700 text-white">
        <h1 className="text-3xl font-extrabold">Track Your Order</h1>
        <p className="opacity-90 mt-1 text-sm">
          Enter your order number to see real-time status. Logged-in users can also track from{" "}
          <Link href="/orders" className="underline font-semibold">
            My Orders
          </Link>
          .
        </p>
      </section>

      <form onSubmit={submit} className="card p-4 flex gap-2">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Order number (e.g. SKT-2025-12345)"
          className="input flex-1"
        />
        <button className="btn-primary" disabled={loading}>
          {loading ? "Tracking…" : "Track"}
        </button>
      </form>

      {err && <div className="card p-4 bg-red-50 text-red-700 text-sm">{err}</div>}

      {result && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500">Order Number</p>
              <p className="font-mono font-semibold">{result.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold">{result.status}</p>
            </div>
          </div>

          {result.expectedBy && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded">
              📅 Expected delivery by <b>{new Date(result.expectedBy).toLocaleDateString()}</b>
            </div>
          )}

          {/* Horizontal timeline (desktop) */}
          <div className="hidden md:flex items-start justify-between relative pt-4">
            <div className="absolute top-10 left-8 right-8 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-gradient-to-r from-brand-green to-green-500 rounded transition-all"
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
                <div key={s.key} className="relative z-10 text-center w-1/6">
                  <div
                    className={`mx-auto w-12 h-12 rounded-full grid place-items-center text-xl shadow ${
                      done
                        ? "bg-brand-green text-white"
                        : "bg-gray-200 text-gray-500"
                    } ${active ? "ring-4 ring-brand-green/30 animate-pulse" : ""}`}
                  >
                    {s.icon}
                  </div>
                  <p className={`text-xs mt-2 ${done ? "font-semibold" : "text-gray-500"}`}>
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
                <div key={s.key} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full grid place-items-center text-lg shrink-0 ${
                      done ? "bg-brand-green text-white" : "bg-gray-200 text-gray-500"
                    } ${active ? "ring-4 ring-brand-green/30" : ""}`}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${done ? "font-semibold" : "text-gray-500"}`}>
                      {s.label}
                    </p>
                    {done && (
                      <p className="text-[11px] text-gray-500">
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
