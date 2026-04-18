"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, formatPaise } from "@/lib/api";

interface ReferralInfo {
  code: string;
  referredBy?: string | null;
  referred: Array<{ id: string; name: string; createdAt: string }>;
  bonusPaise: number;
}

export default function ReferralPage() {
  const { token } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    if (!token) return;
    const r = await api<ReferralInfo>("/api/referral/", { token });
    setInfo(r);
  }

  useEffect(() => { load(); }, [token]);

  async function apply() {
    try {
      await api("/api/referral/apply", { method: "POST", token, json: { code } });
      setMsg("Applied! Your referrer gets a bonus on your first order.");
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!info) return <div className="card p-6">Loading...</div>;

  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${info.code}` : "";

  return (
    <div className="space-y-4">
      <div className="card p-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <p className="text-sm opacity-80">Refer & Earn {formatPaise(info.bonusPaise)}</p>
        <p className="text-4xl font-bold mt-2 font-mono">{info.code}</p>
        <p className="text-xs mt-2 opacity-80">Share this code with friends. When they place their first order, you both get bonus wallet credit.</p>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Share your link</h2>
        <div className="flex gap-2">
          <input value={link} readOnly className="border rounded px-3 py-2 text-sm flex-1" />
          <button
            onClick={() => { navigator.clipboard.writeText(link); setMsg("Copied!"); }}
            className="btn-primary"
          >
            Copy
          </button>
        </div>
        {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
      </section>

      {!info.referredBy && (
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Have a referral code?</h2>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="FRIEND123"
              className="border rounded px-3 py-2 text-sm"
            />
            <button onClick={apply} className="btn-primary">Apply</button>
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Friends you&apos;ve referred</h2>
        {info.referred.length === 0 ? (
          <p className="text-sm text-gray-500">No referrals yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {info.referred.map((r) => (
              <li key={r.id} className="py-2 flex justify-between">
                <span>{r.name}</span>
                <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
