"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

export default function VendorOnboardingPage() {
  const { user, token, refresh, ready } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    storeName: "",
    slug: "",
    description: "",
    gstin: "",
    pan: "",
    bankAccount: "",
    ifsc: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) router.push("/login?next=/vendor/onboarding");
    if (user?.vendor) router.push("/vendor");
  }, [ready, token, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/api/vendor", { token, method: "POST", json: form });
      await refresh();
      router.push("/vendor");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Become a seller on SKT Mart</h1>
      <form onSubmit={submit} className="card p-6 space-y-3">
        <input
          className="input"
          placeholder="Store name (e.g. Raj Electronics)"
          value={form.storeName}
          onChange={(e) => setForm({ ...form, storeName: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Store slug (e.g. raj-electronics)"
          value={form.slug}
          onChange={(e) =>
            setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
          }
          required
        />
        <textarea
          className="input"
          placeholder="About your store"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="GSTIN"
            value={form.gstin}
            onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
          />
          <input
            className="input"
            placeholder="PAN"
            value={form.pan}
            onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
          />
          <input
            className="input"
            placeholder="Bank account"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
          />
          <input
            className="input"
            placeholder="IFSC"
            value={form.ifsc}
            onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
          />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <p className="text-xs text-gray-500">
          By submitting, you agree to the SKT Mart Seller Agreement. Your listing will be reviewed
          by our team before going live (usually 24–48 hours).
        </p>
        <button className="btn-yellow w-full" disabled={loading}>
          {loading ? "…" : "Register as Seller"}
        </button>
      </form>
    </div>
  );
}
