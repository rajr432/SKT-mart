"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface VendorOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
  order: {
    id: string;
    orderNumber: string;
    placedAt: string;
    address: { name: string; city: string; pincode: string; phone?: string | null };
    user: { name: string };
  };
}

const NEXT: Record<string, string | null> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: null, // DELIVERED requires OTP
  DELIVERED: null,
};

const statusColor: Record<string, string> = {
  PLACED: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border border-sky-200",
  PACKED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-700 border border-violet-200",
  OUT_FOR_DELIVERY: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border border-rose-200",
  RETURNED: "bg-gray-50 text-gray-700 border border-gray-200",
};

export default function VendorOrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<VendorOrderItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { items } = await api<{ items: VendorOrderItem[] }>("/api/vendor/orders", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const advance = async (id: string, next: string) => {
    setBusy(id);
    try {
      await api(`/api/vendor/orders/${id}/status`, {
        token,
        method: "PATCH",
        json: { status: next },
      });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const verifyOtp = async (orderId: string) => {
    setBusy(orderId);
    setMsg(null);
    try {
      await api(`/api/vendor/orders/${orderId}/verify-otp`, {
        token,
        method: "POST",
        json: { otp },
      });
      setMsg("Delivered ✓");
      setOtp("");
      setOtpOrderId(null);
      await load();
    } catch (e) {
      alert((e as Error).message || "Invalid OTP");
    } finally {
      setBusy(null);
    }
  };

  const filtered =
    filter === "ALL" ? items : items.filter((i) => i.status === filter);

  const counts: Record<string, number> = { ALL: items.length };
  for (const s of [
    "PLACED",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ]) {
    counts[s] = items.filter((i) => i.status === s).length;
  }

  return (
    <div className="space-y-4">
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Vendor</p>
            <h2 className="font-display text-xl tracking-tight">Orders to fulfill</h2>
          </div>
          {msg && (
            <span className="text-[11px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
              {msg}
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {["ALL", "PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 px-4 py-2 text-xs font-medium rounded-full transition ${
                  filter === s
                    ? "bg-accent text-white shadow-soft"
                    : "bg-gray-50 text-gray-700 border border-gray-100 hover:border-accent/40 hover:text-accent"
                }`}
              >
                {s.replace(/_/g, " ")} ({counts[s] ?? 0})
              </button>
            ),
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((it) => {
          const next = NEXT[it.status];
          const canOtp = it.status === "OUT_FOR_DELIVERY";
          const otpOpen = otpOrderId === it.order.id;
          return (
            <div
              key={it.id}
              className="card-premium p-5 hover:shadow-glow/30 transition"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold tracking-tight">
                      #{it.order.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full ${statusColor[it.status] ?? "bg-gray-50 text-gray-700 border border-gray-200"}`}
                    >
                      {it.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    <span className="font-medium tracking-tight">{it.name}</span>{" "}
                    <span className="text-gray-400">× {it.quantity}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {it.order.user.name} · {it.order.address.city} — {it.order.address.pincode}
                    {it.order.address.phone ? ` · ${it.order.address.phone}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(it.order.placedAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-lg tracking-tight">
                    {formatPaise(it.price * it.quantity)}
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap justify-end">
                    {next && (
                      <button
                        disabled={busy === it.id}
                        onClick={() => advance(it.id, next)}
                        className="text-xs font-medium bg-accent text-white px-4 py-2 rounded-full shadow-soft hover:bg-accent-dark disabled:opacity-50 transition"
                      >
                        {busy === it.id ? "…" : `Mark ${next.replace(/_/g, " ")}`}
                      </button>
                    )}
                    {canOtp && !otpOpen && (
                      <button
                        onClick={() => {
                          setOtpOrderId(it.order.id);
                          setOtp("");
                        }}
                        className="text-xs font-medium bg-emerald-600 text-white px-4 py-2 rounded-full shadow-soft hover:bg-emerald-700 transition"
                      >
                        Verify OTP &amp; Deliver
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {canOtp && otpOpen && (
                <div className="mt-4 p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 border border-violet-100 rounded-2xl">
                  <p className="text-xs text-gray-700 mb-3">
                    Ask the customer for the 4-digit OTP they received via email/SMS.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      autoFocus
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      maxLength={4}
                      placeholder="0000"
                      className="input !w-32 text-center font-mono text-lg tracking-widest"
                    />
                    <button
                      disabled={otp.length !== 4 || busy === it.order.id}
                      onClick={() => verifyOtp(it.order.id)}
                      className="text-xs font-medium bg-emerald-600 text-white px-5 py-2 rounded-full shadow-soft hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {busy === it.order.id ? "Verifying…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => {
                        setOtpOrderId(null);
                        setOtp("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card-premium p-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 grid place-items-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-accent">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </div>
            <p className="font-display text-base tracking-tight">No orders in {filter.replace(/_/g, " ")}</p>
            <p className="text-xs text-gray-400 mt-1">New orders will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
