"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { AdCampaign, Product } from "@/lib/types";

export default function VendorAdsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    productId: "",
    name: "",
    budgetPaise: 50000,
    bidPaise: 500,
  });
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const [a, p] = await Promise.all([
      api<{ items: AdCampaign[] }>("/api/ads/", { token }),
      api<{ items: Product[] }>("/api/vendor/products", { token }).catch(() => ({ items: [] })),
    ]);
    setItems(a.items);
    setProducts(p.items);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function create() {
    try {
      await api("/api/ads/", { method: "POST", token, json: form });
      setMsg("Campaign created as DRAFT. Activate it below.");
      setForm({ productId: "", name: "", budgetPaise: 50000, bidPaise: 500 });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function activate(id: string) {
    try {
      await api(`/api/ads/${id}/activate`, { method: "POST", token });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function pause(id: string) {
    await api(`/api/ads/${id}/pause`, { method: "POST", token });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Promote your products (Ads)</h1>
        <p className="text-sm text-gray-500">
          Sponsored listings appear at the top of search & category. Cost deducts from your wallet per click/impression.
        </p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Create Campaign</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <select
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">Select product to promote</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Campaign name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <label className="text-sm">
            Budget (paise)
            <input
              type="number"
              value={form.budgetPaise}
              onChange={(e) => setForm({ ...form, budgetPaise: Number(e.target.value) })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Bid per click (paise)
            <input
              type="number"
              value={form.bidPaise}
              onChange={(e) => setForm({ ...form, bidPaise: Number(e.target.value) })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
        </div>
        <button onClick={create} className="btn-primary">
          Create Campaign
        </button>
        {msg && <p className="text-sm text-blue-600">{msg}</p>}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Your Campaigns</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 border-b">
            <tr>
              <th className="py-2">Name</th>
              <th>Product</th>
              <th>Status</th>
              <th>Budget / Spent</th>
              <th>Bid</th>
              <th>Impr.</th>
              <th>Clicks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name}</td>
                <td className="text-xs">{c.product?.name}</td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : c.status === "PAUSED"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="text-xs">
                  {formatPaise(c.spentPaise)} / {formatPaise(c.budgetPaise)}
                </td>
                <td className="text-xs">{formatPaise(c.bidPaise)}</td>
                <td>{c.impressions}</td>
                <td>{c.clicks}</td>
                <td className="space-x-1">
                  {c.status === "DRAFT" || c.status === "PAUSED" ? (
                    <button
                      onClick={() => activate(c.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Activate
                    </button>
                  ) : c.status === "ACTIVE" ? (
                    <button
                      onClick={() => pause(c.id)}
                      className="text-xs text-yellow-600 hover:underline"
                    >
                      Pause
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No campaigns yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
