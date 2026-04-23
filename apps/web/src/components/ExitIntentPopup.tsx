"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// First-time visitor exit-intent capture. Triggers on mouse leaving the
// viewport top (desktop) or hard scroll-up bounce (mobile). Shows once per
// 7 days. Coupon code + message come from admin /admin/settings so no code
// change is needed to run a promo.
type Settings = {
  exitIntentCouponCode?: string;
  exitIntentMessage?: string;
};

const SEEN_KEY = "sktmart.exitIntent.seenAt";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export default function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    api<Settings>("/api/settings/public")
      .then((s) => {
        if (!mounted) return;
        setCode(s?.exitIntentCouponCode ?? "");
        setMsg(s?.exitIntentMessage ?? "");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!code) return;
    const seen = Number(localStorage.getItem(SEEN_KEY) ?? "0");
    if (seen && Date.now() - seen < COOLDOWN_MS) return;

    const trigger = () => {
      if (open) return;
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {}
    };

    let lastY = window.scrollY;
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y < lastY - 80 && y < 100) trigger();
      lastY = y;
    };
    // Give the user ~10s of exploration before even arming the listeners.
    const armT = setTimeout(() => {
      document.addEventListener("mouseout", onMouseOut);
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 10_000);
    return () => {
      clearTimeout(armT);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [code, open]);

  if (!open || !code) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        <div className="text-4xl mb-2">🎁</div>
        <h3 className="text-lg font-semibold">{msg || "Wait! Here's a gift"}</h3>
        <p className="text-sm text-gray-600 mt-1">Use this code on checkout:</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <code className="px-3 py-2 rounded bg-gray-100 font-mono font-semibold tracking-wider">{code}</code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
            className="px-3 py-2 rounded bg-brand-blue text-white text-sm hover:opacity-90"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-3">Subject to T&amp;Cs. Applicable on select products.</p>
      </div>
    </div>
  );
}
