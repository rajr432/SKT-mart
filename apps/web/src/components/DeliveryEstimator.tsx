"use client";

import { useMemo } from "react";

interface Props {
  shippingDays?: number;
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DeliveryEstimator({ shippingDays = 4 }: Props) {
  const { min, max } = useMemo(() => {
    const lo = new Date();
    lo.setDate(lo.getDate() + Math.max(1, shippingDays - 1));
    const hi = new Date();
    hi.setDate(hi.getDate() + shippingDays + 2);
    return { min: fmt(lo), max: fmt(hi) };
  }, [shippingDays]);

  return (
    <div className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded px-3 py-2 inline-flex items-center gap-2">
      <span>📦</span>
      <span>
        Delivery by <b>{min}</b> – <b>{max}</b>
      </span>
    </div>
  );
}
