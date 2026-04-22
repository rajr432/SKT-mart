"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

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
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { items } = await api<{ items: B[] }>("/api/admin/banners", { token });
    setItems(items);
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) {
      alert("Image chahiye — URL paste karo ya gallery se upload karo");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/banners", { token, method: "POST", json: form });
      setForm({ title: "", image: "", link: "", position: 0 });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (b: B) => {
    await api(`/api/admin/banners/${b.id}`, {
      token,
      method: "PATCH",
      json: { active: !b.active },
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await api(`/api/admin/banners/${id}`, { token, method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 md:p-6">
        <h2 className="font-semibold mb-3">Add banner</h2>
        <form onSubmit={add} className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Link URL (optional)"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>
          <ImageUploader
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
            token={token}
            placeholder="Paste banner image URL or tap Upload to pick from gallery"
            aspect="aspect-[4/1]"
          />
          <div className="grid md:grid-cols-[120px_1fr] gap-3 items-center">
            <input
              className="input"
              type="number"
              placeholder="Position"
              value={form.position}
              onChange={(e) =>
                setForm({ ...form, position: parseInt(e.target.value || "0", 10) })
              }
            />
            <button className="btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add banner"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">All banners ({items.length})</h2>
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No banners yet.</p>
        )}
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="flex gap-3 items-center border-b last:border-b-0 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image}
                alt={b.title}
                className="w-28 h-14 object-cover rounded border"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  pos {b.position} · {b.link || "no link"}
                </p>
              </div>
              <button
                onClick={() => toggle(b)}
                className={`text-xs px-2 py-1 rounded ${
                  b.active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {b.active ? "Active" : "Hidden"}
              </button>
              <button
                onClick={() => del(b.id)}
                className="text-red-600 text-xs hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
