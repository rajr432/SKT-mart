"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Coupon } from "@/lib/types";

export default function AdminCouponsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState({
    code: "",
    title: "",
    type: "PERCENT" as "PERCENT" | "FLAT",
    value: 10,
    minOrder: 0,
  });

  const load = async () => {
    const { items } = await api<{ items: Coupon[] }>("/api/admin/coupons", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/admin/coupons", { token, method: "POST", json: form });
    setForm({ code: "", title: "", type: "PERCENT", value: 10, minOrder: 0 });
    load();
  };

  const del = async (id: string) => {
    await api(`/api/admin/coupons/${id}`, { token, method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card p-4 grid md:grid-cols-5 gap-3">
        <input
          className="input"
          placeholder="Code (e.g. NEW10)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />
        <input
          className="input md:col-span-2"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          className="input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FLAT" })}
        >
          <option>PERCENT</option>
          <option>FLAT</option>
        </select>
        <input
          className="input"
          type="number"
          placeholder={form.type === "PERCENT" ? "% value" : "Paise value"}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
        />
        <button className="btn-primary md:col-span-5">Add Coupon</button>
      </form>

      <div className="card p-4 space-y-3">
        {items.map((c) => (
          <div key={c.id} className="flex justify-between items-center border-b last:border-0 py-2">
            <div>
              <p className="font-medium">{c.code}</p>
              <p className="text-xs text-gray-500">
                {c.title} · {c.type === "PERCENT" ? `${c.value}%` : formatPaise(c.value)}
              </p>
            </div>
            <button onClick={() => del(c.id)} className="text-red-600 text-xs">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
