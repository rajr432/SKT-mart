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

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  VENDOR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CUSTOMER: "bg-sky-50 text-sky-700 border-sky-200",
};

export default function AdminAuditPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<{ items: AuditEntry[] }>("/api/admin/audit-log?limit=200", { token })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Security</p>
        <h1 className="font-display text-2xl tracking-tightest">Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last 200 admin &amp; vendor actions on the platform.
        </p>
      </div>

      <div className="card-premium p-5 sm:p-6">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-12 w-full rounded-2xl" />
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
                <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No audit entries yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 text-left">
                    <Th>Time</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>IP</Th>
                    <Th>Metadata</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((a) => (
                    <tr key={a.id} className="hover:bg-violet-50/30 transition">
                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium tracking-tight text-[13px]">
                          {a.actor?.name ?? "System"}
                        </p>
                        {a.actor?.role && (
                          <span
                            className={`inline-block mt-0.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              ROLE_TONE[a.actor.role] ||
                              "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {a.actor.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-accent">
                        {a.action}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className="text-gray-700">{a.entity}</span>
                        {a.entityId && (
                          <span className="text-gray-400 ml-1">
                            {a.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {a.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] max-w-xs truncate text-gray-500">
                        {a.metadata ? JSON.stringify(a.metadata) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-2.5">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-gray-100 p-4 hover:border-accent/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight">
                        {a.actor?.name ?? "System"}
                      </p>
                      <p className="font-mono text-[11px] text-accent mt-0.5 truncate">
                        {a.action}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {a.entity}
                        {a.entityId && (
                          <span className="text-gray-400 ml-1">
                            {a.entityId.slice(0, 8)}
                          </span>
                        )}
                      </p>
                    </div>
                    {a.actor?.role && (
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          ROLE_TONE[a.actor.role] ||
                          "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {a.actor.role}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider text-gray-400">
                    <span>{new Date(a.createdAt).toLocaleString()}</span>
                    {a.ipAddress && <span>· {a.ipAddress}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400">
      {children}
    </th>
  );
}
