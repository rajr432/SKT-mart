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
            "49900 = ₹499 (default)",
          )}
          {field("commissionPercentBelow", "Commission % (below threshold)", "number", "Default 5%")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Shipping & Tax</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("freeShippingMin", "Free shipping minimum (paise)")}
          {field("shippingFee", "Shipping fee (paise)")}
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

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Marketing</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {field("announcementBar", "Announcement bar text", "text", "Leave empty to hide")}
          {field("announcementLink", "Announcement link (optional)", "text")}
          {field("exitIntentCouponCode", "Exit-intent coupon code", "text", "Shown when user tries to leave")}
          {field("exitIntentMessage", "Exit-intent message", "text")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">EMI</h2>
        <div className="grid md:grid-cols-4 gap-3">
          {field("emiEnabled", "EMI enabled on PDP", "checkbox")}
          {field("emiMinAmountPaise", "Minimum amount for EMI (paise)")}
          {field("emiInterestPercent", "Annual interest % (for estimate)")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Wallet cashback tiers</h2>
        <p className="text-xs text-gray-500">
          On every wallet recharge, the customer gets a bonus credit based on the highest tier
          they qualify for. Empty = feature off. All amounts in paise (₹ × 100).
        </p>
        <CashbackTiersEditor
          value={Array.isArray(s.walletCashbackTiers) ? s.walletCashbackTiers : []}
          onChange={(tiers) => setS({ ...s, walletCashbackTiers: tiers })}
        />
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">COD & Returns</h2>
        <div className="grid md:grid-cols-4 gap-3">
          {field("codEnabled", "COD available at checkout", "checkbox")}
          {field("codMaxOrderPaise", "Max order for COD (paise)")}
          {field("codFeePaise", "COD fee (paise)")}
          {field("returnWindowDays", "Return window (days)")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Branding & Theme</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("brandLogo", "Logo URL", "text", "Header logo (paste URL or upload via /admin/banners)")}
          {field("brandFavicon", "Favicon URL", "text", "32x32 .ico/.png")}
          {field("brandPrimary", "Primary color (#hex)", "text", "Default #2874f0")}
          {field("brandAccent", "Accent color (#hex)", "text", "Default #ff9f00")}
          {field("brandDark", "Dark color (#hex)", "text", "Default #172337")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Hero Banner Copy (homepage)</h2>
        <p className="text-xs text-gray-500">When set, replaces the rotating hero copy. Leave blank for defaults.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {field("heroTitle", "Hero title", "text")}
          {field("heroSubtitle", "Hero subtitle", "text")}
          {field("heroCtaText", "CTA button text", "text")}
          {field("heroCtaLink", "CTA link (path or URL)", "text")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Footer</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {field("footerAddress", "Registered address", "text")}
          {field("footerGstin", "GSTIN", "text")}
          {field("footerCopyright", "Copyright line", "text")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Social Links</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {field("socialFacebook", "Facebook URL", "text")}
          {field("socialInstagram", "Instagram URL", "text")}
          {field("socialTwitter", "Twitter / X URL", "text")}
          {field("socialYoutube", "YouTube URL", "text")}
          {field("socialWhatsapp", "WhatsApp URL or number", "text")}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Payment Methods</h2>
        <p className="text-xs text-gray-500">Toggle off to hide a method at checkout.</p>
        <div className="grid md:grid-cols-3 gap-3">
          {field("payRazorpayEnabled", "Razorpay (cards / UPI / netbanking)", "checkbox")}
          {field("payWalletEnabled", "Wallet payment", "checkbox")}
          {field("payUpiEnabled", "UPI direct (where supported)", "checkbox")}
        </div>
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

// Tier editor — stored as an array on AppSettings.walletCashbackTiers. We keep
// the UI tiny (minPaise / cashbackPaise + delete) and let the backend handle
// validation + tier selection. "Add tier" is capped at 10 to match the API.
interface Tier {
  minPaise: number;
  cashbackPaise: number;
}
function CashbackTiersEditor({
  value,
  onChange,
}: {
  value: Tier[];
  onChange: (t: Tier[]) => void;
}) {
  const update = (i: number, patch: Partial<Tier>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-gray-400">No tiers configured. Add one below.</p>
      )}
      {value.map((t, i) => (
        <div key={i} className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="text-[11px] text-gray-600">Min recharge (paise)</span>
            <input
              type="number"
              value={t.minPaise}
              min={1}
              onChange={(e) => update(i, { minPaise: Number(e.target.value) })}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-[11px] text-gray-600">Cashback (paise)</span>
            <input
              type="number"
              value={t.cashbackPaise}
              min={1}
              onChange={(e) => update(i, { cashbackPaise: Number(e.target.value) })}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="px-3 py-2 text-sm border rounded text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ))}
      {value.length < 10 && (
        <button
          type="button"
          onClick={() => onChange([...value, { minPaise: 50000, cashbackPaise: 2500 }])}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add tier
        </button>
      )}
    </div>
  );
}
