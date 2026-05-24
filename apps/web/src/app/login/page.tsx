"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-10">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "password") {
        const { token, user } = await api<{ token: string; user: User }>("/api/auth/login", {
          method: "POST",
          json: { identifier, password },
        });
        login(token, user);
      } else {
        if (!sent) {
          await api("/api/auth/otp/request", { method: "POST", json: { target: identifier } });
          setSent(true);
          return;
        }
        const { token, user } = await api<{ token: string; user: User }>("/api/auth/otp/verify", {
          method: "POST",
          json: { target: identifier, code: otp },
        });
        login(token, user);
      }
      router.push(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-5xl">
      <div className="bg-white rounded-3xl shadow-soft grid md:grid-cols-[1.1fr_1fr] overflow-hidden">
        <aside className="relative hidden md:block bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 p-10 text-white overflow-hidden">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col h-full">
            <span className="glass rounded-2xl p-3 inline-flex w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="SKT Mart" className="h-12 w-auto rounded-lg" />
            </span>
            <div className="mt-auto pt-12">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-medium">Welcome back</p>
              <h2 className="font-display text-4xl font-bold mt-3 leading-tight">Sign in to your<br/>SKT Mart bag</h2>
              <p className="text-sm mt-4 text-white/85 max-w-sm">
                Track orders, save favourites, and unlock exclusive member-only deals.
              </p>
              <div className="flex items-center gap-2 mt-6 text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> Free returns
                <span className="h-1.5 w-1.5 rounded-full bg-white/70 ml-2" /> 100% secure
                <span className="h-1.5 w-1.5 rounded-full bg-white/70 ml-2" /> 24/7 support
              </div>
            </div>
          </div>
        </aside>
        <form onSubmit={submit} className="p-6 sm:p-10 space-y-4">
          <div className="md:hidden">
            <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
            <p className="text-sm text-ink-muted mt-1">Sign in to continue</p>
          </div>
          <div className="hidden md:block">
            <h1 className="font-display text-2xl font-bold text-ink">Sign in</h1>
            <p className="text-sm text-ink-muted mt-1">Welcome back, glad to see you again.</p>
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full text-xs font-medium w-fit">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setSent(false);
              }}
              className={`px-4 py-1.5 rounded-full transition ${mode === "password" ? "bg-white text-accent shadow-sm" : "text-ink-muted"}`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setSent(false);
              }}
              className={`px-4 py-1.5 rounded-full transition ${mode === "otp" ? "bg-white text-accent shadow-sm" : "text-ink-muted"}`}
            >
              OTP
            </button>
          </div>

          <input
            className="input"
            placeholder="Email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          {mode === "password" && (
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm select-none"
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          )}
          {mode === "otp" && sent && (
            <input
              className="input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          )}
          {mode === "otp" && !sent && (
            <p className="text-xs text-gray-500">
              We will send a 6-digit OTP. In dev mode, it is logged to the API console.
            </p>
          )}

          {err && (
            <div className="text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2.5">
              {err}
            </div>
          )}

          {mode === "password" && (
            <div className="text-right -mt-2">
              <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-dark font-medium">
                Forgot password?
              </Link>
            </div>
          )}

          <button
            disabled={loading}
            className="btn-pill bg-accent text-white hover:bg-accent-dark w-full py-3 text-base shadow-glow disabled:opacity-50"
          >
            {loading
              ? "…"
              : mode === "otp" && !sent
                ? "Send OTP"
                : mode === "otp"
                  ? "Verify & Sign in"
                  : "Sign in"}
          </button>

          <div className="flex items-center gap-3 text-[11px] text-ink-muted uppercase tracking-widest">
            <span className="flex-1 h-px bg-gray-200" />
            or continue with
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleSignIn next={next} />

          <p className="text-sm text-center text-ink-muted pt-2">
            New to SKT Mart?{" "}
            <Link href="/register" className="text-accent font-semibold hover:text-accent-dark">
              Create an account →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
