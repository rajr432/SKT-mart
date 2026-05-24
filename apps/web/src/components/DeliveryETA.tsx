"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PincodeInfo {
  pincode: string;
  city?: string;
  state?: string;
  serviceable: boolean;
  etaDays: number | null;
}

// Customer-facing "deliver by" checker on PDP. Uses existing public
// `/api/pincodes/:code` lookup. We cache the last entered pincode in
// localStorage so it auto-populates on next visit for a smoother flow.
export default function DeliveryETA() {
  const [pin, setPin] = useState("");
  const [info, setInfo] = useState<PincodeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("last_pincode") : null;
    if (saved && /^\d{6}$/.test(saved)) {
      setPin(saved);
      check(saved);
    }
  }, []);

  const check = async (code: string) => {
    setErr("");
    setInfo(null);
    if (!/^\d{6}$/.test(code)) {
      setErr("Enter a valid 6-digit pincode");
      return;
    }
    setLoading(true);
    try {
      const r = await api<PincodeInfo>(`/api/pincodes/${code}`);
      setInfo(r);
      localStorage.setItem("last_pincode", code);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const eta = info?.serviceable && info.etaDays
    ? new Date(Date.now() + info.etaDays * 24 * 60 * 60 * 1000).toLocaleDateString(
        "en-IN",
        { weekday: "short", day: "numeric", month: "short" },
      )
    : null;

  return (
    <div className="card p-3 space-y-2">
      <p className="text-sm font-medium">Check delivery</p>
      <div className="flex gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter pincode"
          className="input flex-1"
          inputMode="numeric"
          maxLength={6}
        />
        <button
          onClick={() => check(pin)}
          disabled={loading || pin.length !== 6}
          className="btn-outline"
        >
          {loading ? "…" : "Check"}
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {info && info.serviceable && eta && (
        <p className="text-sm text-green-700">
          ✓ Delivery by <strong>{eta}</strong>
          {info.city ? <span className="text-gray-500"> · {info.city}, {info.state}</span> : null}
        </p>
      )}
      {info && !info.serviceable && (
        <p className="text-sm text-red-600">
          Sorry, we don't deliver to <strong>{pin}</strong> yet.
        </p>
      )}
    </div>
  );
}
