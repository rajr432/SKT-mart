"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Lazy-load non-critical widgets so they don't block first paint.
// They mount only after the main UI is interactive (idle callback).
const InstallPrompt = dynamic(() => import("./InstallPrompt"), { ssr: false });
const PushSubscribePrompt = dynamic(() => import("./PushSubscribePrompt"), { ssr: false });
const LiveChatWidget = dynamic(() => import("./LiveChatWidget"), { ssr: false });
const ScrollToTop = dynamic(() => import("./ScrollToTop"), { ssr: false });
const AppUpdateBanner = dynamic(() => import("./AppUpdateBanner"), { ssr: false });
const ExitIntentPopup = dynamic(() => import("./ExitIntentPopup"), { ssr: false });
const ServiceWorkerRegistrar = dynamic(() => import("./ServiceWorkerRegistrar"), { ssr: false });

export default function DeferredWidgets() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const idle =
      w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const handle = idle(() => setReady(true), { timeout: 2500 });
    return () => {
      const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback;
      if (cancel && typeof handle === "number") cancel(handle);
    };
  }, []);
  if (!ready) return null;
  return (
    <>
      <InstallPrompt />
      <ServiceWorkerRegistrar />
      <PushSubscribePrompt />
      <LiveChatWidget />
      <ScrollToTop />
      <AppUpdateBanner />
      <ExitIntentPopup />
    </>
  );
}
