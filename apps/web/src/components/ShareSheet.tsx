"use client";

import { useState } from "react";

interface Props {
  title: string;
  url: string;
}

// PDP share button. Prefers native Web Share API on mobile (system sheet
// with full app list); falls back to WhatsApp/Telegram/FB + copy-link on
// desktop. Kept minimal — no extra deps.
export default function ShareSheet({ title, url }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const text = `Check out "${title}" on SKT Mart`;
  const encoded = encodeURIComponent(`${text} — ${url}`);

  const handleShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user dismissed or share unsupported — fall through to menu
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <button onClick={handleShare} className="btn-outline text-sm">
        ↗ Share
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl p-4 w-full md:max-w-sm space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold">Share this product</p>
            <a
              href={`https://wa.me/?text=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-md bg-green-50 text-green-700"
            >
              WhatsApp
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-md bg-sky-50 text-sky-700"
            >
              Telegram
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-md bg-blue-50 text-blue-700"
            >
              Facebook
            </a>
            <button
              onClick={copy}
              className="w-full text-left py-2 px-3 rounded-md bg-gray-50 text-gray-700"
            >
              {copied ? "✓ Link copied" : "Copy link"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-2 py-2 text-sm text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
