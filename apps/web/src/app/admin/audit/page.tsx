"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  actor?: { name: string; email?: string | null; role: string } | null;
}

export default function AdminAuditPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (token) api<{ items: AuditEntry[] }>("/api/admin/audit-log?limit=200", { token }).then((r) => setItems(r.items));
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-gray-500">Last 200 admin & vendor actions on the platform.</p>
      </div>
      <div className="card p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2 text-[11px]">{new Date(a.createdAt).toLocaleString()}</td>
                <td>
                  <div className="font-medium">{a.actor?.name ?? "System"}</div>
                  <div className="text-[11px] text-gray-500">{a.actor?.role ?? ""}</div>
                </td>
                <td className="font-mono text-[11px]">{a.action}</td>
                <td className="text-[11px]">
                  {a.entity}
                  {a.entityId && <span className="text-gray-500"> {a.entityId.slice(0, 8)}</span>}
                </td>
                <td className="text-[11px]">{a.ipAddress ?? "-"}</td>
                <td className="text-[11px] max-w-xs truncate">
                  {a.metadata ? JSON.stringify(a.metadata) : ""}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
