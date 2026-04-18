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
    <div className="container-page py-10 max-w-lg">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-4">Create your SKT Mart account</h1>
        <form onSubmit={submit} className="space-y-3">
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
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "CUSTOMER" | "VENDOR" })}
          >
            <option value="CUSTOMER">Register as customer</option>
            <option value="VENDOR">Register as seller/vendor</option>
          </select>

          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button className="btn-yellow w-full" disabled={loading}>
            {loading ? "…" : "Create account"}
          </button>
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-brand">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
