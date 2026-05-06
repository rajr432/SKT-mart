"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "CUSTOMER" as "CUSTOMER" | "VENDOR",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/api/auth/register", {
        method: "POST",
        json: form,
      });
      login(token, user);
      router.push(form.role === "VENDOR" ? "/vendor/onboarding" : "/");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-5xl">
      <div className="bg-white rounded-3xl shadow-soft grid md:grid-cols-[1fr_1.1fr] overflow-hidden">
        <form onSubmit={submit} className="p-6 sm:p-10 space-y-3 order-2 md:order-1">
          <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="text-sm text-ink-muted -mt-1 mb-2">
            Free to join. Track orders, save favourites & earn SKT Coins.
          </p>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-full text-xs font-medium w-fit">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "CUSTOMER" })}
              className={`px-4 py-1.5 rounded-full transition ${form.role === "CUSTOMER" ? "bg-white text-accent shadow-sm" : "text-ink-muted"}`}
            >
              Shopper
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "VENDOR" })}
              className={`px-4 py-1.5 rounded-full transition ${form.role === "VENDOR" ? "bg-white text-accent shadow-sm" : "text-ink-muted"}`}
            >
              Sell on SKT Mart
            </button>
          </div>

          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phone (10 digits)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="input"
            placeholder="Password (min 6 characters)"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={6}
            required
          />

          {err && (
            <div className="text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2.5">
              {err}
            </div>
          )}
          <button
            className="btn-pill bg-accent text-white hover:bg-accent-dark w-full py-3 text-base shadow-glow disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "…" : `Create ${form.role === "VENDOR" ? "seller" : "shopper"} account →`}
          </button>
          <p className="text-[11px] text-ink-muted text-center">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-accent">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline hover:text-accent">Privacy Policy</Link>.
          </p>
          <p className="text-sm text-center text-ink-muted pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-semibold hover:text-accent-dark">
              Sign in →
            </Link>
          </p>
        </form>
        <aside className="relative hidden md:block bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 p-10 text-white overflow-hidden order-1 md:order-2">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col h-full">
            <span className="glass rounded-2xl p-3 inline-flex w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="SKT Mart" className="h-12 w-auto rounded-lg" />
            </span>
            <div className="mt-auto pt-12">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-medium">Join SKT Mart</p>
              <h2 className="font-display text-4xl font-bold mt-3 leading-tight">
                A premium<br />shopping<br />experience.
              </h2>
              <ul className="mt-6 space-y-2 text-sm text-white/85">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" />
                  Earn <strong>1 SKT Coin per ₹100</strong> spent — redeem instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" />
                  Free returns within 7 days, COD available
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" />
                  Refer a friend, earn ₹100 each
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
