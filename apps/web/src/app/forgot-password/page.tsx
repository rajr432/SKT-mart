"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        json: { identifier },
      });
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-md">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">Forgot password</h1>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
              If an account with that email exists, we&apos;ve sent a password
              reset link. Check your inbox (and spam folder).
            </div>
            <p className="text-sm text-gray-600">
              Link is valid for 30 minutes.
            </p>
            <Link href="/login" className="btn-primary block text-center">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your registered email or phone number. We&apos;ll send a
              reset link to your email.
            </p>
            <input
              className="input"
              placeholder="Email or phone"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <button disabled={loading} className="btn-yellow w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-sm text-center">
              Remember your password?{" "}
              <Link href="/login" className="text-brand hover:underline">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
