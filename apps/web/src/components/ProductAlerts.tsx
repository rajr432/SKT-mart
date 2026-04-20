"use client";

import { useState } from "react";
import { api, formatPaise } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function ProductAlerts({
  productId,
  currentPrice,
  inStock,
}: {
  productId: string;
  currentPrice: number;
  inStock: boolean;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState<null | "price" | "stock">(null);
  const [target, setTarget] = useState(Math.floor((currentPrice * 0.9) / 100));
  const [busy, setBusy] = useState(false);

  const mustLogin = () => {
    alert("Please log in to set alerts.");
  };

  const setPriceAlert = async () => {
    if (!token) return mustLogin();
    if (target <= 0) return alert("Enter a target price");
    if (target * 100 >= currentPrice) return alert("Target must be less than current price");
    setBusy(true);
    try {
      await api("/api/alerts/price", {
        token,
        method: "POST",
        json: { productId, targetPrice: target * 100 },
      });
      alert("Price drop alert set — we'll notify you");
      setOpen(null);
    } catch {
      alert("Could not set alert");
    } finally {
      setBusy(false);
    }
  };

  const setStockAlert = async () => {
    if (!token) return mustLogin();
    setBusy(true);
    try {
      await api("/api/alerts/stock", { token, method: "POST", json: { productId } });
      alert("Back-in-stock alert set");
      setOpen(null);
    } catch {
      alert("Could not set alert");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen("price")}
          className="text-xs border border-brand text-brand rounded px-3 py-1.5 hover:bg-brand/5"
        >
          🔔 Price drop alert
        </button>
        {!inStock && (
          <button
            onClick={() => setOpen("stock")}
            className="text-xs border border-orange-500 text-orange-600 rounded px-3 py-1.5 hover:bg-orange-50"
          >
            📦 Notify when in stock
          </button>
        )}
      </div>

      {open === "price" && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Set price drop alert</h3>
            <p className="text-sm text-gray-600 mt-1">
              Current price: <b>{formatPaise(currentPrice)}</b>
            </p>
            <label className="block mt-3 text-sm">
              Alert me when price drops to (₹)
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value) || 0)}
                className="input mt-1 w-full"
              />
            </label>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(null)} className="flex-1 border rounded py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={setPriceAlert}
                disabled={busy}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {busy ? "Setting…" : "Set alert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open === "stock" && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Back-in-stock alert</h3>
            <p className="text-sm text-gray-600 mt-1">
              We'll email + notify you the moment this is restocked.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(null)} className="flex-1 border rounded py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={setStockAlert}
                disabled={busy}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {busy ? "Setting…" : "Notify me"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
