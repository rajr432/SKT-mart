"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface Stats {
  users: number;
  vendors: number;
  products: number;
  orders: number;
  revenue: number;
}

const QUICK_ACTIONS: { href: string; icon: string; label: string; color: string }[] = [
  { href: "/admin/orders", icon: "📦", label: "Orders", color: "from-blue-500 to-blue-600" },
  { href: "/admin/products", icon: "🛍️", label: "Products", color: "from-purple-500 to-purple-600" },
  { href: "/admin/vendors", icon: "🏪", label: "Vendors", color: "from-emerald-500 to-emerald-600" },
  { href: "/admin/users", icon: "👥", label: "Users", color: "from-orange-500 to-orange-600" },
  { href: "/admin/returns", icon: "↩️", label: "Returns", color: "from-red-500 to-red-600" },
  { href: "/admin/payouts", icon: "💸", label: "Payouts", color: "from-indigo-500 to-indigo-600" },
  { href: "/admin/coupons", icon: "🎟️", label: "Coupons", color: "from-pink-500 to-pink-600" },
  { href: "/admin/banners", icon: "🖼️", label: "Banners", color: "from-cyan-500 to-cyan-600" },
  { href: "/admin/analytics", icon: "📊", label: "Analytics", color: "from-violet-500 to-violet-600" },
  { href: "/admin/audit", icon: "🔍", label: "Audit Log", color: "from-slate-500 to-slate-600" },
  { href: "/admin/settings", icon: "⚙️", label: "Settings", color: "from-gray-500 to-gray-600" },
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<Stats>("/api/admin/stats", { token })
      .then(setStats)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-5">
      <div className="card p-5 bg-gradient-to-br from-[#2874f0] to-[#7b4bff] text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome to Admin</h1>
          <p className="text-sm opacity-90 mt-1">Real-time marketplace control panel</p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <Link href="/admin/orders" className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm backdrop-blur">📦 Manage orders</Link>
            <Link href="/admin/vendors" className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm backdrop-blur">🏪 Approve vendors</Link>
            <Link href="/admin/returns" className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm backdrop-blur">↩️ Process returns</Link>
          </div>
        </div>
        <div className="absolute right-4 top-4 text-6xl opacity-20">⚡</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-8 w-24 bg-gray-200 rounded mt-3" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="👥" label="Users" value={stats.users} accent="from-blue-500/10 to-blue-500/5" />
          <StatCard icon="🏪" label="Vendors" value={stats.vendors} accent="from-emerald-500/10 to-emerald-500/5" />
          <StatCard icon="🛍️" label="Products" value={stats.products} accent="from-purple-500/10 to-purple-500/5" />
          <StatCard icon="📦" label="Orders" value={stats.orders} accent="from-orange-500/10 to-orange-500/5" />
          <StatCard icon="💰" label="Revenue" value={formatPaise(stats.revenue)} accent="from-green-500/10 to-green-500/5" big />
        </div>
      ) : null}

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`relative p-4 rounded-xl bg-gradient-to-br ${a.color} text-white hover:scale-[1.03] transition shadow-md`}
            >
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">📋 Recent activity</h3>
          <ul className="text-sm space-y-2 text-gray-700">
            <li className="flex items-center gap-2"><span className="h-2 w-2 bg-green-500 rounded-full"></span> System operational</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 bg-blue-500 rounded-full"></span> Real-time push notifications active</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 bg-purple-500 rounded-full"></span> Email alerts sending via SMTP</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 bg-orange-500 rounded-full"></span> WhatsApp vendor notifications ready</li>
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">🚨 Action items</h3>
          <ul className="text-sm space-y-2 text-gray-700">
            <li><Link className="text-brand hover:underline" href="/admin/vendors">Review pending vendor approvals →</Link></li>
            <li><Link className="text-brand hover:underline" href="/admin/returns">Process return requests →</Link></li>
            <li><Link className="text-brand hover:underline" href="/admin/payouts">Release vendor payouts →</Link></li>
            <li><Link className="text-brand hover:underline" href="/admin/analytics">View today&apos;s sales report →</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent, big }: { icon: string; label: string; value: string | number; accent: string; big?: boolean }) {
  return (
    <div className={`card p-4 bg-gradient-to-br ${accent} border-0 relative overflow-hidden ${big ? "col-span-2 md:col-span-1" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-gray-600 font-medium tracking-wide">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
    </div>
  );
}
