"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface B {
  id: string;
  title: string;
  image: string;
  link?: string | null;
  position: number;
  active: boolean;
}

export default function AdminBannersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<B[]>([]);
  const [form, setForm] = useState({ title: "", image: "", link: "", position: 0 });

  const load = async () => {
    const { items } = await api<{ items: B[] }>("/api/admin/banners", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/admin/banners", { token, method: "POST", json: form });
    setForm({ title: "", image: "", link: "", position: 0 });
    load();
  };

  const del = async (id: string) => {
    await api(`/api/admin/banners/${id}`, { token, method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card p-4 grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          className="input md:col-span-2"
          placeholder="Image URL"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Link"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
        />
        <button className="btn-primary md:col-span-4">Add Banner</button>
      </form>

      <div className="card p-4 space-y-3">
        {items.map((b) => (
          <div key={b.id} className="flex gap-3 items-center">
            <img src={b.image} alt={b.title} className="w-24 h-12 object-cover" />
            <div className="flex-1">
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-gray-500">{b.link ?? "—"}</p>
            </div>
            <button onClick={() => del(b.id)} className="text-red-600 text-xs">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
