"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

// Admin-editable content. Known blocks rendered with typed UIs; anything
// else can be added/removed as raw JSON at the bottom.
type HeroSlide = { title: string; subtitle?: string; image: string; link?: string };
type Testimonial = { name: string; role?: string; avatar?: string; quote: string; rating?: number };
type TrustBadge = { icon: string; title: string; subtitle?: string };
type FooterLink = { label: string; href: string };
type FooterSection = { title: string; links: FooterLink[] };

type ContentMap = {
  hero?: HeroSlide[];
  testimonials?: Testimonial[];
  trustBadges?: TrustBadge[];
  footer?: FooterSection[];
  [k: string]: unknown;
};

export default function AdminSiteContentPage() {
  const { token } = useAuth();
  const [content, setContent] = useState<ContentMap>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ content: ContentMap }>("/api/site-content").then((r) => setContent(r.content ?? {}));
  }, []);

  async function saveKey(key: string, value: unknown) {
    setSaving(key);
    setMsg("");
    try {
      await api(`/api/site-content/${encodeURIComponent(key)}`, {
        token,
        method: "PUT",
        json: { value },
      });
      setContent((c) => ({ ...c, [key]: value }));
      setMsg(`Saved "${key}" ✓`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  // ---- HERO ----
  const hero: HeroSlide[] = Array.isArray(content.hero) ? content.hero : [];
  const addSlide = () =>
    setContent((c) => ({ ...c, hero: [...hero, { title: "", image: "" }] }));
  const updSlide = (i: number, patch: Partial<HeroSlide>) => {
    const next = [...hero];
    next[i] = { ...next[i], ...patch };
    setContent((c) => ({ ...c, hero: next }));
  };
  const delSlide = (i: number) =>
    setContent((c) => ({ ...c, hero: hero.filter((_, j) => j !== i) }));

  // ---- TESTIMONIALS ----
  const testimonials: Testimonial[] = Array.isArray(content.testimonials) ? content.testimonials : [];
  const addT = () =>
    setContent((c) => ({
      ...c,
      testimonials: [...testimonials, { name: "", quote: "", rating: 5 }],
    }));
  const updT = (i: number, patch: Partial<Testimonial>) => {
    const next = [...testimonials];
    next[i] = { ...next[i], ...patch };
    setContent((c) => ({ ...c, testimonials: next }));
  };
  const delT = (i: number) =>
    setContent((c) => ({ ...c, testimonials: testimonials.filter((_, j) => j !== i) }));

  // ---- TRUST BADGES ----
  const trustBadges: TrustBadge[] = Array.isArray(content.trustBadges) ? content.trustBadges : [];
  const addB = () =>
    setContent((c) => ({ ...c, trustBadges: [...trustBadges, { icon: "🔒", title: "" }] }));
  const updB = (i: number, patch: Partial<TrustBadge>) => {
    const next = [...trustBadges];
    next[i] = { ...next[i], ...patch };
    setContent((c) => ({ ...c, trustBadges: next }));
  };
  const delB = (i: number) =>
    setContent((c) => ({ ...c, trustBadges: trustBadges.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">Site Content</h1>
        <p className="text-sm text-gray-500">Edit what customers see on the home page — hero slides, testimonials, trust badges.</p>
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </div>

      {/* HERO */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Hero slides</h2>
          <div className="flex gap-2">
            <button onClick={addSlide} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">+ Add slide</button>
            <button onClick={() => saveKey("hero", hero)} disabled={saving === "hero"} className="btn-primary text-sm">
              {saving === "hero" ? "Saving…" : "Save hero"}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {hero.map((s, i) => (
            <div key={i} className="border rounded p-3 grid md:grid-cols-[1fr_240px] gap-3">
              <div className="space-y-2">
                <input className="input w-full" placeholder="Title" value={s.title} onChange={(e) => updSlide(i, { title: e.target.value })} />
                <input className="input w-full" placeholder="Subtitle (optional)" value={s.subtitle ?? ""} onChange={(e) => updSlide(i, { subtitle: e.target.value })} />
                <input className="input w-full" placeholder="Link (e.g. /category/mobiles)" value={s.link ?? ""} onChange={(e) => updSlide(i, { link: e.target.value })} />
                <button onClick={() => delSlide(i)} className="text-xs text-red-600 hover:underline">Remove slide</button>
              </div>
              <ImageUploader value={s.image} onChange={(url) => updSlide(i, { image: url })} token={token} aspect="aspect-video" />
            </div>
          ))}
          {hero.length === 0 && <p className="text-sm text-gray-500">No slides yet. Click "+ Add slide".</p>}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Customer testimonials</h2>
          <div className="flex gap-2">
            <button onClick={addT} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">+ Add</button>
            <button onClick={() => saveKey("testimonials", testimonials)} disabled={saving === "testimonials"} className="btn-primary text-sm">
              {saving === "testimonials" ? "Saving…" : "Save testimonials"}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <div key={i} className="border rounded p-3 grid md:grid-cols-[1fr_240px] gap-3">
              <div className="space-y-2">
                <input className="input w-full" placeholder="Customer name" value={t.name} onChange={(e) => updT(i, { name: e.target.value })} />
                <input className="input w-full" placeholder="Role / city (optional)" value={t.role ?? ""} onChange={(e) => updT(i, { role: e.target.value })} />
                <textarea className="input w-full min-h-[80px]" placeholder="Quote" value={t.quote} onChange={(e) => updT(i, { quote: e.target.value })} />
                <input
                  className="input w-32"
                  type="number"
                  min={1}
                  max={5}
                  value={t.rating ?? 5}
                  onChange={(e) => updT(i, { rating: Number(e.target.value) })}
                />
                <button onClick={() => delT(i)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
              <ImageUploader value={t.avatar ?? ""} onChange={(url) => updT(i, { avatar: url })} token={token} aspect="aspect-square" placeholder="Avatar image" />
            </div>
          ))}
          {testimonials.length === 0 && <p className="text-sm text-gray-500">No testimonials yet.</p>}
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Trust badges (PDP strip)</h2>
          <div className="flex gap-2">
            <button onClick={addB} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">+ Add</button>
            <button onClick={() => saveKey("trustBadges", trustBadges)} disabled={saving === "trustBadges"} className="btn-primary text-sm">
              {saving === "trustBadges" ? "Saving…" : "Save badges"}
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {trustBadges.map((b, i) => (
            <div key={i} className="border rounded p-3 flex gap-3">
              <input className="input w-14" value={b.icon} onChange={(e) => updB(i, { icon: e.target.value })} placeholder="🔒" />
              <div className="flex-1 space-y-2">
                <input className="input w-full" placeholder="Title (e.g. 'Secure payments')" value={b.title} onChange={(e) => updB(i, { title: e.target.value })} />
                <input className="input w-full" placeholder="Subtitle (optional)" value={b.subtitle ?? ""} onChange={(e) => updB(i, { subtitle: e.target.value })} />
                <button onClick={() => delB(i)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Footer sections</h2>
        <p className="text-xs text-gray-500 mb-2">
          Raw JSON editor. Shape: <code>[{`{ title, links: [{ label, href }] }`}]</code>
        </p>
        <textarea
          className="input w-full min-h-[180px] font-mono text-xs"
          value={JSON.stringify(content.footer ?? [], null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setContent((c) => ({ ...c, footer: parsed }));
            } catch { /* ignore parse errors until save */ }
          }}
        />
        <div className="mt-2">
          <button onClick={() => saveKey("footer", content.footer ?? [])} disabled={saving === "footer"} className="btn-primary text-sm">
            {saving === "footer" ? "Saving…" : "Save footer"}
          </button>
        </div>
      </section>
    </div>
  );
}
