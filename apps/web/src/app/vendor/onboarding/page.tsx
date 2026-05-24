"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface VendorStatus {
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    status: string;
    registrationPaid: boolean;
  } | null;
  feePaise: number;
  registrationPaid: boolean;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function VendorOnboardingPage() {
  const { user, token, refresh, ready } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<VendorStatus | null>(null);
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
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/vendor/onboarding");
      return;
    }
    api<VendorStatus>("/api/vendor/status", { token })
      .then(setStatus)
      .catch(() => setStatus({ vendor: null, feePaise: 19900, registrationPaid: false }));
  }, [ready, token, router]);

  useEffect(() => {
    // Load Razorpay checkout script lazily
    if (typeof window === "undefined") return;
    if (document.getElementById("rzp-script")) return;
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/api/vendor/apply", { token, method: "POST", json: form });
      const fresh = await api<VendorStatus>("/api/vendor/status", { token });
      setStatus(fresh);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const payWithWallet = async () => {
    setErr(null);
    setPaying(true);
    try {
      await api("/api/vendor/pay-registration/wallet", { token, method: "POST", json: {} });
      await refresh();
      router.push("/vendor");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  const payWithRazorpay = async () => {
    setErr(null);
    setPaying(true);
    try {
      const { razorpayOrderId, amount, keyId } = await api<{
        razorpayOrderId: string | null;
        amount: number;
        keyId: string | null;
      }>("/api/vendor/pay-registration/razorpay/create", { token, method: "POST", json: {} });
      if (!razorpayOrderId || !keyId) {
        setErr("Razorpay not configured. Please use wallet or contact support.");
        setPaying(false);
        return;
      }
      if (!window.Razorpay) {
        setErr("Razorpay script not loaded. Refresh the page.");
        setPaying(false);
        return;
      }
      const rz = new window.Razorpay({
        key: keyId,
        amount,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "SKT Mart",
        description: "Seller registration (lifetime)",
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api("/api/vendor/pay-registration/razorpay/confirm", {
              token,
              method: "POST",
              json: {
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              },
            });
            await refresh();
            router.push("/vendor");
          } catch (e) {
            setErr((e as Error).message);
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
        prefill: { name: user?.name ?? "", email: user?.email ?? "" },
        theme: { color: "#2874f0" },
      });
      rz.open();
    } catch (e) {
      setErr((e as Error).message);
      setPaying(false);
    }
  };

  const fee = status?.feePaise ?? 19900;
  const hasProfile = !!status?.vendor;
  const isPaid = !!status?.registrationPaid;

  return (
    <div className="container-page py-6 max-w-2xl">
      <div className="card p-6 mb-4 bg-gradient-to-br from-brand to-blue-700 text-white">
        <h1 className="text-2xl font-bold mb-2">Become a seller on SKT Mart</h1>
        <p className="text-sm opacity-90">
          Pay a one-time <b>{formatPaise(fee)}</b> lifetime fee and list unlimited products. No
          monthly charges. Commission: 10% on items ≥ ₹499, 5% below. Instant payouts to your bank.
        </p>
      </div>

      {isPaid && hasProfile ? (
        <div className="card p-6 text-center">
          <h2 className="text-lg font-semibold text-green-700">Registration complete ✓</h2>
          <p className="text-sm text-gray-600 mt-2">
            Your seller account is active. Head to the dashboard to list products.
          </p>
          <button className="btn-yellow mt-4" onClick={() => router.push("/vendor")}>
            Go to Vendor Dashboard
          </button>
        </div>
      ) : !hasProfile ? (
        <form onSubmit={apply} className="card p-6 space-y-3">
          <h2 className="font-semibold">Step 1 — Store details</h2>
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
            By submitting you agree to the SKT Mart Seller Agreement. Next step will be the one-time
            registration payment of {formatPaise(fee)}.
          </p>
          <button className="btn-yellow w-full" disabled={loading}>
            {loading ? "…" : "Continue → Pay Registration"}
          </button>
        </form>
      ) : (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Step 2 — Pay registration fee</h2>
          <p className="text-sm text-gray-600">
            Hi <b>{status?.vendor?.storeName}</b>! Pay the one-time <b>{formatPaise(fee)}</b>{" "}
            lifetime seller fee to activate your store.
          </p>
          <div className="rounded-lg border p-4 bg-gradient-to-br from-yellow-50 to-orange-50">
            <ul className="text-sm space-y-1">
              <li>✓ List <b>unlimited</b> products</li>
              <li>✓ Lifetime access — no monthly/yearly renewal</li>
              <li>✓ Write product reviews on any product (lifetime, no ₹199 per review)</li>
              <li>✓ Vendor wallet, analytics, payouts included</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="btn-primary"
              onClick={payWithRazorpay}
              disabled={paying}
              type="button"
            >
              {paying ? "…" : `Pay ${formatPaise(fee)} (UPI / Card)`}
            </button>
            <button
              className="btn-yellow"
              onClick={payWithWallet}
              disabled={paying}
              type="button"
            >
              {paying ? "…" : "Pay from SKT Wallet"}
            </button>
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
        </div>
      )}
    </div>
  );
}
