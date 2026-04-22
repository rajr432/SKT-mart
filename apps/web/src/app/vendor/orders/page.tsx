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
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-yellow-100 text-yellow-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-gray-100 text-gray-700",
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
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Orders to fulfill</h2>
          {msg && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
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
                className={`shrink-0 px-3 py-1.5 text-xs rounded-full transition ${
                  filter === s
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {s.replace(/_/g, " ")} ({counts[s] ?? 0})
              </button>
            ),
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="space-y-3">
          {filtered.map((it) => {
            const next = NEXT[it.status];
            const canOtp = it.status === "OUT_FOR_DELIVERY";
            const otpOpen = otpOrderId === it.order.id;
            return (
              <div
                key={it.id}
                className="border rounded-lg p-3 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        #{it.order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor[it.status] ?? "bg-gray-100"}`}
                      >
                        {it.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="font-medium">{it.name}</span>{" "}
                      <span className="text-gray-500">× {it.quantity}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {it.order.user.name} · {it.order.address.city}{" "}
                      — {it.order.address.pincode}
                      {it.order.address.phone ? ` · ${it.order.address.phone}` : ""}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(it.order.placedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">
                      {formatPaise(it.price * it.quantity)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap justify-end">
                      {next && (
                        <button
                          disabled={busy === it.id}
                          onClick={() => advance(it.id, next)}
                          className="text-xs bg-brand text-white px-3 py-1.5 rounded hover:bg-brand-dark disabled:opacity-50"
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
                          className="text-xs bg-brand-green text-white px-3 py-1.5 rounded hover:opacity-90"
                        >
                          📱 Verify OTP &amp; Deliver
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {canOtp && otpOpen && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-xs text-gray-700 mb-2">
                      Ask the customer for the 4-digit OTP they received via
                      email/SMS.
                    </p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        maxLength={4}
                        placeholder="0000"
                        className="input !w-28 text-center font-mono text-lg tracking-widest"
                      />
                      <button
                        disabled={otp.length !== 4 || busy === it.order.id}
                        onClick={() => verifyOtp(it.order.id)}
                        className="text-xs bg-brand-green text-white px-4 py-1.5 rounded disabled:opacity-50"
                      >
                        {busy === it.order.id ? "Verifying…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => {
                          setOtpOrderId(null);
                          setOtp("");
                        }}
                        className="text-xs text-gray-600 px-2"
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
            <p className="text-sm text-gray-500 py-6 text-center">
              No orders in {filter.replace(/_/g, " ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
