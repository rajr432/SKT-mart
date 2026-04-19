"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

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
    <div className="container-page py-10 max-w-4xl">
      <div className="card grid md:grid-cols-[1fr_1.3fr] overflow-hidden">
        <aside className="bg-brand text-white p-8 hidden md:flex md:flex-col md:items-start md:gap-6">
          <span className="bg-white rounded-lg p-3 inline-flex shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="SKT Mart" className="h-16 w-auto" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold">Login</h2>
            <p className="text-sm mt-3 text-blue-100">
              Get access to your Orders, Wishlist and Recommendations.
            </p>
          </div>
        </aside>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setSent(false);
              }}
              className={mode === "password" ? "text-brand font-semibold" : "text-gray-500"}
            >
              Password
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setSent(false);
              }}
              className={mode === "otp" ? "text-brand font-semibold" : "text-gray-500"}
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
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button disabled={loading} className="btn-yellow w-full">
            {loading
              ? "…"
              : mode === "otp" && !sent
                ? "Send OTP"
                : mode === "otp"
                  ? "Verify & Login"
                  : "Login"}
          </button>

          <p className="text-sm text-center">
            New to SKT Mart?{" "}
            <Link href="/register" className="text-brand">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
