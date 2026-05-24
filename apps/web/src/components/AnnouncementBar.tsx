"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// Renders the admin-controlled announcement bar at the top of every page.
// Hidden if the string is empty, so admins can disable by clearing the
// field in /admin/settings. Dismissible per-session via localStorage.
type PublicSettings = {
  announcementBar?: string;
  announcementLink?: string | null;
};

const DISMISS_KEY = "sktmart.announcementBar.dismissed";

export default function AnnouncementBar() {
  const [text, setText] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) : null;
    api<PublicSettings>("/api/settings/public")
      .then((s) => {
        if (!s?.announcementBar) return;
        setText(s.announcementBar);
        setLink(s.announcementLink ?? null);
        // Re-show if text changed since dismissal.
        if (stored && stored === s.announcementBar) setDismissed(true);
      })
      .catch(() => {});
  }, []);

  if (!text || dismissed) return null;
  const inner = <span className="truncate">{text}</span>;

  return (
    <div className="bg-gradient-to-r from-brand-blue to-indigo-600 text-white text-xs sm:text-sm">
      <div className="container-page flex items-center justify-between gap-3 py-1.5">
        {link ? (
          <Link href={link} className="flex-1 min-w-0 hover:underline">
            {inner}
          </Link>
        ) : (
          <div className="flex-1 min-w-0">{inner}</div>
        )}
        <button
          aria-label="Dismiss announcement"
          className="opacity-80 hover:opacity-100 px-1"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, text);
            } catch {}
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
