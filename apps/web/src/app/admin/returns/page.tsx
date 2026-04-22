"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { ReturnRequest } from "@/lib/types";

export default function AdminReturnsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ReturnRequest[]>([]);

  async function load() {
    if (!token) return;
    const r = await api<{ items: ReturnRequest[] }>("/api/returns/", { token });
    setItems(r.items);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function transition(id: string, status: string) {
    await api(`/api/returns/${id}/transition`, { method: "POST", token, json: { status } });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Return Requests</h1>
      </div>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">RMA #</th>
              <th>Order</th>
              <th>Reason</th>
              <th>Mode</th>
              <th>Refund</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b align-top">
                <td className="py-2 font-mono text-[11px]">{r.rmaNumber}</td>
                <td className="text-xs">{r.orderId.slice(0, 8)}</td>
                <td>{r.reason}</td>
                <td>{r.refundMode}</td>
                <td>{formatPaise(r.refundPaise)}</td>
                <td>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                    {r.status}
                  </span>
                </td>
                <td className="space-x-1">
                  {r.status === "REQUESTED" && (
                    <>
                      <button
                        onClick={() => transition(r.id, "APPROVED")}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => transition(r.id, "REJECTED")}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "APPROVED" && (
                    <button
                      onClick={() => transition(r.id, "PICKED_UP")}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark Picked Up
                    </button>
                  )}
                  {r.status === "PICKED_UP" && (
                    <button
                      onClick={() => transition(r.id, "RECEIVED")}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark Received
                    </button>
                  )}
                  {r.status === "RECEIVED" && (
                    <>
                      <button
                        onClick={() => transition(r.id, "REFUNDED")}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Refund
                      </button>
                      <button
                        onClick={() => transition(r.id, "REPLACED")}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Mark Replaced
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No returns
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
