"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Address, CartItem } from "@/lib/types";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [method, setMethod] = useState<"RAZORPAY" | "UPI" | "WALLET">("RAZORPAY");
  const [coupon, setCoupon] = useState("");
  const [newAddr, setNewAddr] = useState<Partial<Address> | null>(null);
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    subtotal: number;
    discount: number;
    couponDiscount: number;
    shippingFee: number;
    tax: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login?next=/checkout");
      return;
    }
    (async () => {
      const [a, c] = await Promise.all([
        api<{ items: Address[] }>("/api/addresses", { token }),
        api<{ items: CartItem[] }>("/api/cart", { token }),
      ]);
      setAddresses(a.items);
      setItems(c.items);
      const def = a.items.find((x) => x.isDefault) ?? a.items[0];
      if (def) setAddressId(def.id);
    })();
  }, [ready, token]);

  // Server-side price preview — recomputed whenever cart or coupon changes.
  // Using the backend engine guarantees the displayed total equals the charge.
  useEffect(() => {
    if (!token || items.length === 0) {
      setPreview(null);
      return;
    }
    const addr = addresses.find((x) => x.id === addressId);
    const handle = setTimeout(() => {
      api<typeof preview>("/api/orders/preview", {
        token,
        method: "POST",
        json: { couponCode: coupon || undefined, pincode: addr?.pincode },
      })
        .then((p) => setPreview(p))
        .catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(handle);
  }, [token, items, coupon, addressId, addresses]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
    const selling = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const discount = subtotal - selling;
    if (preview) {
      return {
        subtotal,
        selling,
        discount,
        couponDiscount: preview.couponDiscount,
        shipping: preview.shippingFee,
        tax: preview.tax,
        total: preview.total,
      };
    }
    return {
      subtotal,
      selling,
      discount,
      couponDiscount: 0,
      shipping: 0,
      tax: 0,
      total: selling,
    };
  }, [items, preview]);

  const saveAddress = async () => {
    if (!newAddr) return;
    const { address } = await api<{ address: Address }>("/api/addresses", {
      token,
      method: "POST",
      json: { ...newAddr, isDefault: addresses.length === 0 },
    });
    setAddresses([address, ...addresses]);
    setAddressId(address.id);
    setNewAddr(null);
  };

  const placeOrder = async () => {
    setErr(null);
    if (!addressId) {
      setErr("Please select an address");
      return;
    }
    if (items.length === 0) {
      setErr("Cart is empty");
      return;
    }
    setPlacing(true);
    try {
      const { order } = await api<{ order: { id: string; total: number } }>("/api/orders", {
        token,
        method: "POST",
        json: { addressId, paymentMethod: method, couponCode: coupon || undefined },
      });

      // UPI / cards / netbanking / wallet — Razorpay handles all in one modal.
      if (method === "RAZORPAY" || method === "UPI") {
        const rzp = await api<{
          razorpayOrderId: string;
          amount: number;
          currency: string;
          keyId: string;
        }>("/api/payments/razorpay/create", {
          token,
          method: "POST",
          json: { orderId: order.id },
        });
        if (!rzp.keyId) {
          alert(
            "Razorpay is not configured yet. Order placed in PENDING — admin will confirm shortly.",
          );
          router.push(`/orders/${order.id}`);
          return;
        }

        await loadRazorpayScript();
        type RazorpayResponse = {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };
        type RazorpayInstance = {
          open: () => void;
          on: (e: string, h: (resp: { error?: { description?: string } }) => void) => void;
        };
        type RazorpayCtor = new (opts: Record<string, unknown>) => RazorpayInstance;
        const RazorpayCls = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
        if (!RazorpayCls) {
          alert("Could not load Razorpay. Try again.");
          router.push(`/orders/${order.id}`);
          return;
        }

        const rzpInstance = new RazorpayCls({
          key: rzp.keyId,
          amount: rzp.amount,
          currency: rzp.currency || "INR",
          name: "SKT Mart",
          description: `Order ${order.id.slice(0, 8)}`,
          order_id: rzp.razorpayOrderId,
          theme: { color: "#7c3aed" },
          prefill: {
            email: undefined,
            contact: undefined,
          },
          notes: { orderId: order.id },
          handler: async (resp: RazorpayResponse) => {
            try {
              await api("/api/payments/razorpay/verify", {
                token,
                method: "POST",
                json: {
                  orderId: order.id,
                  razorpayOrderId: resp.razorpay_order_id,
                  razorpayPaymentId: resp.razorpay_payment_id,
                  razorpaySignature: resp.razorpay_signature,
                },
              });
              router.push(`/orders/${order.id}`);
            } catch (e) {
              alert(`Payment verification failed: ${(e as Error).message}`);
              router.push(`/orders/${order.id}`);
            }
          },
          modal: {
            ondismiss: () => {
              router.push(`/orders/${order.id}`);
            },
          },
        });
        rzpInstance.on("payment.failed", (resp) => {
          alert(`Payment failed: ${resp.error?.description || "Try another method"}`);
        });
        rzpInstance.open();
        return;
      }
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  if (!ready) return <div className="container-page py-8">Loading…</div>;

  return (
    <div className="container-page py-6 grid md:grid-cols-[1fr_380px] gap-5">
      <div className="space-y-4">
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Step 1</p>
          <h2 className="font-display text-base tracking-tight mb-4">Delivery address</h2>
          {addresses.length === 0 && !newAddr && (
            <p className="text-sm text-gray-500">No saved addresses yet.</p>
          )}
          <div className="space-y-2">
            {addresses.map((a) => {
              const sel = addressId === a.id;
              return (
                <label
                  key={a.id}
                  className={`flex gap-3 text-sm p-4 rounded-2xl cursor-pointer transition border ${
                    sel
                      ? "border-accent bg-violet-50/40 shadow-soft"
                      : "border-gray-100 hover:border-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={sel}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                  />
                  <div>
                    <p className="font-medium tracking-tight">
                      {a.name} · <span className="text-gray-500 font-normal">{a.phone}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          <button
            onClick={() => setNewAddr(newAddr ? null : { isDefault: false })}
            className="text-accent hover:text-accent-dark text-xs uppercase tracking-wider font-medium mt-4"
          >
            {newAddr ? "Cancel" : "+ Add new address"}
          </button>
          {newAddr && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                ["name", "Name"],
                ["phone", "Phone"],
                ["line1", "Address line 1"],
                ["line2", "Address line 2"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Pincode"],
                ["landmark", "Landmark"],
              ].map(([k, label]) => (
                <input
                  key={k}
                  className="input"
                  placeholder={label}
                  value={(newAddr as any)[k] ?? ""}
                  onChange={(e) => setNewAddr({ ...newAddr, [k]: e.target.value })}
                />
              ))}
              <button onClick={saveAddress} className="btn-primary col-span-2">
                Save Address
              </button>
            </div>
          )}
        </div>

        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Step 2</p>
          <h2 className="font-display text-base tracking-tight mb-4">Order summary</h2>
          <div className="space-y-2">
            {items.map((ci) => (
              <div key={ci.id} className="flex justify-between text-sm py-1.5">
                <span className="text-gray-700">
                  {ci.product.name}{" "}
                  <span className="text-gray-400">× {ci.quantity}</span>
                </span>
                <span className="font-medium tracking-tight">{formatPaise(ci.product.price * ci.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Step 3</p>
          <h2 className="font-display text-base tracking-tight mb-4">Payment method</h2>
          <div className="space-y-2">
            <PaymentTile
              label="Cards · UPI · Net banking"
              sub="Secure checkout powered by Razorpay"
              selected={method === "RAZORPAY"}
              onSelect={() => setMethod("RAZORPAY")}
              icon="card"
            />
            <PaymentTile
              label="UPI apps"
              sub="GPay, PhonePe, Paytm — instant payment"
              selected={method === "UPI"}
              onSelect={() => setMethod("UPI")}
              icon="upi"
            />
            <PaymentTile
              label="SKT Wallet"
              sub="Pay using your wallet balance"
              selected={method === "WALLET"}
              onSelect={() => setMethod("WALLET")}
              icon="wallet"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3" />
            </svg>
            100% secure payments · All major methods supported
          </p>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="card-premium p-5 text-sm sticky top-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Summary</p>
          <h3 className="font-display text-base tracking-tight mb-4">Price details</h3>
          <div className="space-y-1.5">
            <Row label="Price" value={formatPaise(totals.subtotal)} />
            <Row label="Discount" value={`− ${formatPaise(totals.discount)}`} accent />
            {totals.couponDiscount > 0 && (
              <Row label="Coupon" value={`− ${formatPaise(totals.couponDiscount)}`} accent />
            )}
            <Row
              label="Delivery"
              value={totals.shipping === 0 ? "Free" : formatPaise(totals.shipping)}
            />
            <Row label="Tax" value={formatPaise(totals.tax)} />
          </div>
          <div className="border-t border-gray-100 my-3" />
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Total</span>
            <span className="font-display text-2xl tracking-tightest">
              {formatPaise(totals.total)}
            </span>
          </div>
          <input
            placeholder="Coupon code (e.g. WELCOME10)"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            className="input mt-4"
          />
          {err && (
            <p className="text-rose-700 bg-rose-50 border border-rose-200 text-xs mt-3 px-3 py-2 rounded-2xl">
              {err}
            </p>
          )}
          <button
            disabled={placing}
            onClick={placeOrder}
            className="btn-primary w-full mt-4 disabled:opacity-50"
          >
            {placing ? "Placing…" : `Place order — ${formatPaise(totals.total)}`}
          </button>
          <Link
            href="/cart"
            className="text-center text-xs uppercase tracking-wider text-gray-500 hover:text-accent block mt-3"
          >
            ← Back to cart
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={accent ? "text-emerald-600 font-medium" : "text-gray-800"}>{value}</span>
    </div>
  );
}

type PayIcon = "card" | "upi" | "wallet";

function PaymentTile({
  label,
  sub,
  selected,
  onSelect,
  icon,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onSelect: () => void;
  icon: PayIcon;
}) {
  return (
    <label
      className={`flex items-center gap-3 text-sm p-4 rounded-2xl cursor-pointer transition border ${
        selected
          ? "border-accent bg-violet-50/40 shadow-soft"
          : "border-gray-100 hover:border-accent/40"
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 accent-[color:var(--accent)]"
      />
      <span
        className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${
          selected ? "bg-accent text-white" : "bg-violet-50 text-accent"
        }`}
      >
        <PayIconSvg name={icon} />
      </span>
      <div className="min-w-0">
        <p className="font-medium tracking-tight truncate">{label}</p>
        <p className="text-xs text-gray-500 truncate">{sub}</p>
      </div>
    </label>
  );
}

function PayIconSvg({ name }: { name: PayIcon }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px]",
  };
  if (name === "card")
    return (
      <svg {...c}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  if (name === "upi")
    return (
      <svg {...c}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M11 17h2" />
      </svg>
    );
  return (
    <svg {...c}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 13.5h2.5" />
      <path d="M3 9h13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H3" />
    </svg>
  );
}
