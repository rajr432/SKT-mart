"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (token) api<{ settings: AppSettings }>("/api/settings/", { token }).then((r) => setS(r.settings));
  }, [token]);

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg("");
    try {
      await api("/api/settings/", { method: "PATCH", token, json: s });
      setMsg("Saved ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div className="card p-6">Loading...</div>;

  const field = (
    key: keyof AppSettings,
    label: string,
    type: "number" | "text" | "checkbox" = "number",
    hint?: string,
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {type === "checkbox" ? (
        <input
          type="checkbox"
          checked={s[key] as boolean}
          onChange={(e) => setS({ ...s, [key]: e.target.checked })}
          className="ml-2"
        />
      ) : (
        <input
          type={type}
          value={String(s[key] ?? "")}
          onChange={(e) =>
            setS({ ...s, [key]: type === "number" ? Number(e.target.value) : e.target.value })
          }
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
        />
      )}
      {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Platform Settings</h1>
        <p className="text-sm text-gray-500">Control commission, shipping, loyalty, and operations.</p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Commission</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("commissionPercent", "Commission % (above threshold)", "number", "Default 10%")}
          {field(
            "commissionThreshold",
            "Threshold (paise)",
            "number",
            "50000 = ₹500",
          )}
          {field("commissionPercentBelow", "Commission % (below threshold)", "number", "Default 5%")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Shipping & Tax</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("freeShippingMin", "Free shipping minimum (paise)")}
          {field("shippingFee", "Shipping fee (paise)")}
          {field("codCharge", "COD charge (paise)")}
          {field("codMaxOrder", "COD max order value (paise)")}
          {field("taxPercent", "Default tax %")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Loyalty & Referral</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("loyaltyEarnPer100", "Coins earned per ₹100", "number", "1 coin / ₹100")}
          {field("loyaltyValuePaise", "Value per coin (paise)", "number", "100 = ₹1")}
          {field("loyaltyMaxRedeemPct", "Max % of cart redeemable", "number", "20 = 20%")}
          {field("referralBonusPaise", "Referral bonus (paise)")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Ads</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("adMinBudgetPaise", "Minimum campaign budget (paise)")}
          {field("adClickCostPaise", "Default click cost (paise)")}
          {field("adImpressionCostPaise", "Impression cost (paise)")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Site</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("siteName", "Site name", "text")}
          {field("supportEmail", "Support email", "text")}
          {field("supportPhone", "Support phone", "text")}
        </div>
        {field("maintenanceMode", "Maintenance mode (blocks checkout)", "checkbox")}
      </section>

      <div className="card p-4 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <span className="text-sm text-green-600">{msg}</span>
      </div>
    </div>
  );
}
