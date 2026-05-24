"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { ReturnRequest } from "@/lib/types";

export default function MyReturnsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    if (token) api<{ items: ReturnRequest[] }>("/api/returns/mine", { token }).then((r) => setItems(r.items));
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">My Returns</h1>
      </div>
      <div className="card divide-y">
        {items.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-mono text-xs text-gray-500">{r.rmaNumber}</p>
                <p className="font-medium mt-1">{r.reason}</p>
                {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{r.status}</span>
                <p className="text-sm mt-2">Refund: {formatPaise(r.refundPaise)}</p>
                <p className="text-[11px] text-gray-500">Mode: {r.refundMode}</p>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No returns yet. From Orders page, select an item to initiate return.</div>}
      </div>
    </div>
  );
}
