"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Stats {
  productCount: number;
  totalOrders: number;
  revenue: number;
  unitsSold: number;
  pendingOrders: number;
}

export default function VendorDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) return;
    api<Stats>("/api/vendor/stats", { token }).then(setStats).catch(() => null);
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">
          Welcome{user?.vendor ? `, ${user.vendor.storeName}` : ""}
        </h1>
        {user?.vendor && (
          <p className="text-xs mt-1 text-gray-500">
            Store status:{" "}
            <span
              className={
                user.vendor.status === "APPROVED" ? "text-brand-green" : "text-orange-600"
              }
            >
              {user.vendor.status}
            </span>
          </p>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Products" value={stats.productCount} />
          <Stat label="Orders" value={stats.totalOrders} />
          <Stat label="Revenue" value={formatPaise(stats.revenue)} />
          <Stat label="Pending" value={stats.pendingOrders} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
