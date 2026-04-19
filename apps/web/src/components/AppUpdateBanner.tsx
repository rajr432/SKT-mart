"use client";

import { useEffect, useState } from "react";

/** Listens for the service-worker "controllerchange" event and prompts the
 * user to reload when a new version is waiting. Also shown once on first
 * install so returning users know the app updated. */
export default function AppUpdateBanner() {
  const [newVersion, setNewVersion] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onChange = () => setNewVersion(true);
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!newVersion) return null;
  return (
    <div className="fixed bottom-[150px] md:bottom-6 left-3 md:left-6 z-40 card bg-brand text-white p-3 pr-2 flex items-center gap-2 shadow-2xl text-sm max-w-sm">
      <span>✨ A new version of SKT Mart is available.</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs font-semibold"
      >
        Reload
      </button>
      <button
        onClick={() => setNewVersion(false)}
        aria-label="Dismiss"
        className="text-white/70 hover:text-white ml-1"
      >
        ✕
      </button>
    </div>
  );
}
