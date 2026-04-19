"use client";

import { useMemo, useState } from "react";
import { formatPaise } from "@/lib/api";

export default function EmiCalculator({ principalPaise }: { principalPaise: number }) {
  const [months, setMonths] = useState(6);
  const [rate, setRate] = useState(13);

  const emi = useMemo(() => {
    const p = principalPaise;
    const r = rate / 1200; // monthly
    const n = months;
    const e = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(e);
  }, [principalPaise, months, rate]);
  const total = emi * months;
  const interest = total - principalPaise;

  return (
    <div className="border rounded-lg p-3 mt-3 bg-gradient-to-br from-blue-50 to-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">💳</span>
        <h3 className="font-semibold text-sm">EMI from {formatPaise(emi)}/month</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label>
          <span className="text-gray-600">Tenure</span>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full mt-1 border rounded px-2 py-1"
          >
            {[3, 6, 9, 12, 18, 24].map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-gray-600">Interest %</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full mt-1 border rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="mt-2 text-xs grid grid-cols-3 gap-2">
        <div>
          <div className="text-gray-500">Monthly</div>
          <div className="font-semibold">{formatPaise(emi)}</div>
        </div>
        <div>
          <div className="text-gray-500">Interest</div>
          <div className="font-semibold">{formatPaise(interest)}</div>
        </div>
        <div>
          <div className="text-gray-500">Total</div>
          <div className="font-semibold">{formatPaise(total)}</div>
        </div>
      </div>
    </div>
  );
}
