"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";
import type { Address, CartItem } from "@/lib/types";

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

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
    const selling = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const discount = subtotal - selling;
    const shipping = selling >= 50000 ? 0 : 4000;
    return { subtotal, selling, discount, shipping, total: selling + shipping };
  }, [items]);

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

      if (method === "RAZORPAY") {
        const rzp = await api<{ razorpayOrderId: string; amount: number; keyId: string }>(
          "/api/payments/razorpay/create",
          { token, method: "POST", json: { orderId: order.id } },
        );
        if (!rzp.keyId) {
          alert(
            "Razorpay is not configured. Add RAZORPAY_KEY_ID/SECRET in apps/api/.env. Order placed in PENDING state — admin will confirm.",
          );
          router.push(`/orders/${order.id}`);
          return;
        }
        alert(
          "Razorpay checkout hook created. Integrate Razorpay Checkout JS (requires live keys).",
        );
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
    <div className="container-page py-6 grid md:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Delivery Address</h2>
          {addresses.length === 0 && !newAddr && (
            <p className="text-sm text-gray-500">No saved addresses.</p>
          )}
          <div className="space-y-2">
            {addresses.map((a) => (
              <label key={a.id} className="flex gap-2 text-sm border p-3 rounded cursor-pointer">
                <input
                  type="radio"
                  name="addr"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                <div>
                  <p className="font-medium">
                    {a.name} · {a.phone}
                  </p>
                  <p className="text-gray-600">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={() => setNewAddr(newAddr ? null : { isDefault: false })}
            className="text-brand text-sm mt-3"
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

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          {items.map((ci) => (
            <div key={ci.id} className="flex justify-between text-sm py-1">
              <span>
                {ci.product.name} × {ci.quantity}
              </span>
              <span>{formatPaise(ci.product.price * ci.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Payment Method</h2>
          <label className="flex items-center gap-3 text-sm border-2 p-3 rounded mb-2 cursor-pointer hover:border-brand">
            <input
              type="radio"
              checked={method === "RAZORPAY"}
              onChange={() => setMethod("RAZORPAY")}
            />
            <span className="text-2xl">💳</span>
            <div>
              <div className="font-semibold">Razorpay — Card, UPI, Net Banking</div>
              <div className="text-xs text-gray-500">Secure payment powered by Razorpay</div>
            </div>
          </label>
          <label className="flex items-center gap-3 text-sm border-2 p-3 rounded mb-2 cursor-pointer hover:border-brand">
            <input
              type="radio"
              checked={method === "UPI"}
              onChange={() => setMethod("UPI")}
            />
            <span className="text-2xl">📲</span>
            <div>
              <div className="font-semibold">UPI (GPay, PhonePe, Paytm)</div>
              <div className="text-xs text-gray-500">Instant payment via UPI apps</div>
            </div>
          </label>
          <label className="flex items-center gap-3 text-sm border-2 p-3 rounded cursor-pointer hover:border-brand">
            <input
              type="radio"
              checked={method === "WALLET"}
              onChange={() => setMethod("WALLET")}
            />
            <span className="text-2xl">👛</span>
            <div>
              <div className="font-semibold">SKT Wallet</div>
              <div className="text-xs text-gray-500">Pay using your wallet balance</div>
            </div>
          </label>
          <p className="text-xs text-gray-500 mt-3">🔒 100% secure payments · All major methods supported</p>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="card p-4 text-sm sticky top-20">
          <h3 className="text-gray-500 uppercase text-xs mb-3">Price Details</h3>
          <div className="flex justify-between">
            <span>Price</span>
            <span>{formatPaise(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-brand-green">
            <span>Discount</span>
            <span>− {formatPaise(totals.discount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{totals.shipping === 0 ? "Free" : formatPaise(totals.shipping)}</span>
          </div>
          <div className="border-t my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPaise(totals.total)}</span>
          </div>
          <input
            placeholder="Coupon code (e.g. WELCOME10)"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            className="input mt-3"
          />
          {err && <p className="text-red-600 text-xs mt-2">{err}</p>}
          <button
            disabled={placing}
            onClick={placeOrder}
            className="btn-yellow w-full mt-4 disabled:opacity-50"
          >
            {placing ? "Placing…" : "Place Order"}
          </button>
          <Link href="/cart" className="text-center text-sm text-brand block mt-2">
            ← Back to cart
          </Link>
        </div>
      </aside>
    </div>
  );
}
