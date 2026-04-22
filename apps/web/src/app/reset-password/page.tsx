"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-page py-10">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    api<{ ok: boolean; email: string }>(`/api/auth/reset-password/${token}/valid`)
      .then((r) => {
        setValid(true);
        setEmail(r.email ?? "");
      })
      .catch(() => setValid(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        json: { token, password },
      });
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) {
    return (
      <div className="container-page py-10 max-w-md">
        <div className="card p-6 text-center text-gray-500">
          Verifying reset link…
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="container-page py-10 max-w-md">
        <div className="card p-6 space-y-4">
          <h1 className="text-xl font-semibold">Link expired or invalid</h1>
          <p className="text-sm text-gray-600">
            This password reset link has expired or is invalid. Please request a
            new one.
          </p>
          <Link href="/forgot-password" className="btn-primary block text-center">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page py-10 max-w-md">
        <div className="card p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
            Password updated successfully! You can now log in with your new
            password.
          </div>
          <Link href="/login" className="btn-primary block text-center">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-md">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">Set new password</h1>
        {email && (
          <p className="text-sm text-gray-500 mb-4">
            For account: <strong>{email}</strong>
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              className="input pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={loading} className="btn-yellow w-full">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
