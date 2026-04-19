"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

const DISMISSED_KEY = "skt.pushDismissedAt";
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PushSubscribePrompt() {
  const { user, token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 24 * 3600 * 1000) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [user, token]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api<{ publicKey: string | null }>("/api/push/public-key");
      if (!publicKey) {
        console.warn("[push] server VAPID not configured");
        setVisible(false);
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const raw = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await api("/api/push/subscribe", {
        method: "POST",
        json: {
          endpoint: raw.endpoint,
          keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
        },
      });
      setVisible(false);
    } catch (e) {
      console.error("[push] subscribe failed", e);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed bottom-[80px] md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[360px] z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-in slide-in-from-bottom">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Get order & deal updates</div>
          <div className="text-xs text-gray-500 mt-1">
            Enable browser notifications to be notified instantly when your order ships or a flash deal goes live.
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={enable}
              disabled={busy}
              className="bg-brand text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button onClick={dismiss} className="text-sm text-gray-500 px-3 py-1.5">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
