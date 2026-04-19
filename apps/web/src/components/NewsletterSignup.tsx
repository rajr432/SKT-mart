"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return;
    try {
      const list = JSON.parse(localStorage.getItem("skt.newsletter") || "[]");
      if (!list.includes(email)) list.push(email);
      localStorage.setItem("skt.newsletter", JSON.stringify(list));
      localStorage.setItem("skt.firstOrderCoupon", "WELCOME10");
    } catch {}
    setDone(true);
  };

  return (
    <section className="container-page my-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 grid md:grid-cols-2 items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold">Get 10% off your first order</h3>
          <p className="text-sm text-blue-100 mt-1">
            Subscribe for flash deals, coupons & early access. Coupon code:{" "}
            <span className="bg-white/20 px-2 py-0.5 rounded font-mono">WELCOME10</span>
          </p>
        </div>
        {done ? (
          <div className="bg-white/15 rounded-lg p-4 text-center">
            🎉 You&apos;re in! Use <b>WELCOME10</b> at checkout.
          </div>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none"
            />
            <button className="bg-yellow-400 text-gray-900 font-semibold rounded-lg px-4 py-2.5 hover:bg-yellow-300">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
