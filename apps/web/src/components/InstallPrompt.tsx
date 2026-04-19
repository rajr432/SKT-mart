"use client";

import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("skt-install-dismissed") === "1") return;
    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden || !evt) return null;

  const install = async () => {
    await evt.prompt();
    const res = await evt.userChoice;
    if (res.outcome === "accepted") {
      setHidden(true);
    } else {
      localStorage.setItem("skt-install-dismissed", "1");
      setHidden(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem("skt-install-dismissed", "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 inset-x-3 md:inset-x-auto md:right-4 md:max-w-sm z-50 bg-gradient-to-r from-brand to-blue-700 text-white rounded-lg shadow-2xl p-4 pop-in flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpg" alt="" className="w-10 h-10 rounded bg-white p-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install SKT Mart</p>
        <p className="text-xs opacity-90 truncate">
          Faster, offline shortcuts, push-ready. Add to your phone.
        </p>
      </div>
      <button
        onClick={install}
        className="bg-brand-yellow text-brand text-xs font-bold px-3 py-1.5 rounded shrink-0"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        className="text-white/70 hover:text-white text-xl leading-none shrink-0"
        aria-label="dismiss"
      >
        ×
      </button>
    </div>
  );
}
