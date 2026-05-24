"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface PincodeInfo {
  pincode: string;
  city?: string;
  state?: string;
  serviceable: boolean;
  etaDays: number | null;
}

export default function PincodeCheck() {
  const [pin, setPin] = useState("");
  const [info, setInfo] = useState<PincodeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!/^\d{6}$/.test(pin)) {
      alert("Enter a 6-digit pincode");
      return;
    }
    setLoading(true);
    try {
      const data = await api<PincodeInfo>(`/api/pincodes/${pin}`);
      setInfo(data);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-3 border-t">
      <h3 className="text-sm font-medium mb-1">Delivery</h3>
      <div className="flex gap-2 max-w-sm">
        <input
          className="input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter pincode"
        />
        <button className="btn-outline" onClick={check} disabled={loading}>
          Check
        </button>
      </div>
      {info && (
        <p className="text-xs mt-2">
          {info.serviceable ? (
            <span className="text-brand-green">
              ✓ Delivers to {info.city}, {info.state} in {info.etaDays} days
            </span>
          ) : (
            <span className="text-red-600">✗ Not serviceable at this pincode</span>
          )}
        </p>
      )}
    </div>
  );
}
