"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { ReturnRequest } from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 border-sky-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  PICKED_UP: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RECEIVED: "bg-violet-50 text-violet-700 border-violet-200",
  REFUNDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REPLACED: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
};

export default function AdminReturnsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api<{ items: ReturnRequest[] }>("/api/returns/", { token });
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function transition(id: string, status: string) {
    await api(`/api/returns/${id}/transition`, { method: "POST", token, json: { status } });
    load();
  }

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Commerce</p>
          <h1 className="font-display text-2xl tracking-tightest">Return requests</h1>
        </div>
        {!loading && (
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {items.length} request{items.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-6 w-6"
            >
              <path d="M3 12h13a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8" />
              <path d="m6 9-3 3 3 3" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No return requests yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  <Th>RMA #</Th>
                  <Th>Order</Th>
                  <Th>Reason</Th>
                  <Th>Mode</Th>
                  <Th>Refund</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-violet-50/30 transition">
                    <td className="px-4 py-3 font-mono text-[11px]">{r.rmaNumber}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {r.orderId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.reason}</td>
                    <td className="px-4 py-3 text-gray-700">{r.refundMode}</td>
                    <td className="px-4 py-3 font-medium tracking-tight">
                      {formatPaise(r.refundPaise)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          STATUS_TONE[r.status] ||
                          "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActionButtons status={r.status} onTransition={(s) => transition(r.id, s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2.5">
            {items.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] truncate">{r.rmaNumber}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Order {r.orderId.slice(0, 8)} · {r.reason}
                    </p>
                  </div>
                  <p className="font-display text-base tracking-tight shrink-0">
                    {formatPaise(r.refundPaise)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      STATUS_TONE[r.status] ||
                      "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">
                    {r.refundMode}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <ActionButtons status={r.status} onTransition={(s) => transition(r.id, s)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActionButtons({
  status,
  onTransition,
}: {
  status: string;
  onTransition: (status: string) => void;
}) {
  const btn =
    "text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition";
  if (status === "REQUESTED") {
    return (
      <>
        <button
          onClick={() => onTransition("APPROVED")}
          className={`${btn} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}
        >
          Approve
        </button>
        <button
          onClick={() => onTransition("REJECTED")}
          className={`${btn} bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100`}
        >
          Reject
        </button>
      </>
    );
  }
  if (status === "APPROVED") {
    return (
      <button
        onClick={() => onTransition("PICKED_UP")}
        className={`${btn} bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100`}
      >
        Mark Picked Up
      </button>
    );
  }
  if (status === "PICKED_UP") {
    return (
      <button
        onClick={() => onTransition("RECEIVED")}
        className={`${btn} bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100`}
      >
        Mark Received
      </button>
    );
  }
  if (status === "RECEIVED") {
    return (
      <>
        <button
          onClick={() => onTransition("REFUNDED")}
          className={`${btn} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}
        >
          Refund
        </button>
        <button
          onClick={() => onTransition("REPLACED")}
          className={`${btn} bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100`}
        >
          Mark Replaced
        </button>
      </>
    );
  }
  return null;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
