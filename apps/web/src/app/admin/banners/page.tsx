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
    <div className="space-y-5">
      <div className="card-premium p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Content</p>
        <h2 className="font-display text-2xl tracking-tightest mb-1">Add banner</h2>
        <p className="text-xs text-gray-500 mb-5">
          Full image hi dikhega — jitna upload karoge utna show hoga, koi crop nahi.
        </p>
        <form onSubmit={add} className="grid gap-3.5">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
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
          <div className="grid sm:grid-cols-[140px_1fr] gap-3 items-center">
            <input
              className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm outline-none focus:border-accent/40 focus:bg-white transition"
              type="number"
              placeholder="Position"
              value={form.position}
              onChange={(e) =>
                setForm({ ...form, position: parseInt(e.target.value || "0", 10) })
              }
            />
            <button
              className="btn-primary btn-pill"
              disabled={busy}
            >
              {busy ? "Adding…" : "Add banner"}
            </button>
          </div>
        </form>
      </div>

      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Library</p>
            <h2 className="font-display text-2xl tracking-tightest">All banners</h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-gray-500">
            {items.length} banner{items.length === 1 ? "" : "s"}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8" cy="10" r="1.5" />
                <path d="m21 17-5-5-9 9" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No banners yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((b) => (
              <div
                key={b.id}
                className="flex gap-3 items-center rounded-2xl border border-gray-100 p-3 hover:border-accent/30 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image}
                  alt={b.title}
                  className="w-28 h-16 sm:w-32 sm:h-20 object-cover rounded-2xl border border-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium tracking-tight truncate">{b.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    Position {b.position} · {b.link || "no link"}
                  </p>
                </div>
                <button
                  onClick={() => toggle(b)}
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    b.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {b.active ? "Active" : "Hidden"}
                </button>
                <button
                  onClick={() => del(b.id)}
                  className="text-[10px] uppercase tracking-wider text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
