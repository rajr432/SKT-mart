"use client";

import { useState, useEffect } from "react";

interface Props {
  url: string;
  title: string;
  text?: string;
  className?: string;
  compact?: boolean;
}

/** Native Web Share API when available (mobile), else menu of WhatsApp /
 * Twitter / Facebook / copy-link for desktop browsers. Stops propagation so
 * clicking the share icon on a product card doesn't also navigate to the PDP. */
export default function ShareButton({ url, title, text, className, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [absUrl, setAbsUrl] = useState(url);

  useEffect(() => {
    if (typeof window !== "undefined" && url.startsWith("/")) {
      setAbsUrl(window.location.origin + url);
    }
  }, [url]);

  const shareText = text ?? title;
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          text: shareText,
          url: absUrl,
        });
        return;
      } catch {
        // user cancelled — fall through to menu
      }
    }
    setOpen((v) => !v);
  };

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const shareLinks = [
    { label: "WhatsApp", icon: "📱", href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${absUrl}`)}` },
    { label: "Telegram", icon: "✈️", href: `https://t.me/share/url?url=${encodeURIComponent(absUrl)}&text=${encodeURIComponent(shareText)}` },
    { label: "Twitter", icon: "𝕏", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(absUrl)}` },
    { label: "Facebook", icon: "📘", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absUrl)}` },
    { label: "Email", icon: "📧", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${absUrl}`)}` },
  ];

  return (
    <div className={`relative ${className ?? ""}`} onClick={stop}>
      <button
        onClick={handle}
        title="Share"
        aria-label="Share"
        className={
          compact
            ? "h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-sm border border-gray-200"
            : "btn-outline text-sm flex items-center gap-1"
        }
      >
        {compact ? "↗" : <><span>↗</span> Share</>}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 w-48" onClick={stop}>
          <div className="grid grid-cols-1 gap-1">
            {shareLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100"
              >
                <span className="w-5 text-center">{s.icon}</span>
                <span>{s.label}</span>
              </a>
            ))}
            <button
              onClick={copy}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 text-left"
            >
              <span className="w-5 text-center">{copied ? "✓" : "🔗"}</span>
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
