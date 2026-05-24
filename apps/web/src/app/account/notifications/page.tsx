"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    if (!token) return;
    const r = await api<{ items: NotificationItem[]; unread: number }>("/api/notifications/", { token });
    setItems(r.items);
    setUnread(r.unread);
  }

  useEffect(() => { load(); }, [token]);

  async function readAll() {
    await api("/api/notifications/read-all", { method: "POST", token });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-gray-500">{unread} unread</p>
        </div>
        {unread > 0 && <button onClick={readAll} className="text-sm text-blue-600">Mark all read</button>}
      </div>
      <div className="card divide-y">
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.link || "#"}
            className={`block p-4 hover:bg-gray-50 ${!n.read ? "bg-blue-50/40" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1">{n.body}</p>
              </div>
              <span className="text-[11px] text-gray-500">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          </Link>
        ))}
        {items.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No notifications</div>}
      </div>
    </div>
  );
}
