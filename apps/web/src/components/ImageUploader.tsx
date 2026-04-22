"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  token?: string | null;
  placeholder?: string;
  className?: string;
  /**
   * Show a large image preview below the input.
   */
  preview?: boolean;
  /**
   * aspect preview hint (tailwind class), e.g. "aspect-video" | "aspect-square".
   */
  aspect?: string;
}

/**
 * Unified image input. User can paste a URL OR pick a file from their gallery
 * which uploads to `/api/upload` and fills the same field.
 */
export default function ImageUploader({
  value,
  onChange,
  token,
  placeholder = "Image URL or upload",
  className = "",
  preview = true,
  aspect = "aspect-video",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const r = await api<{ urls: string[] }>("/api/upload", {
        token: token ?? undefined,
        method: "POST",
        body: fd,
      });
      if (r.urls?.[0]) onChange(r.urls[0]);
    } catch (error) {
      setErr((error as Error).message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="px-3 py-2 rounded border border-gray-300 text-sm bg-white hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
        >
          {busy ? "Uploading…" : "📷 Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
      </div>
      {err && <p className="text-red-600 text-xs">{err}</p>}
      {preview && value ? (
        <div className={`relative overflow-hidden rounded border border-gray-200 bg-gray-50 ${aspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}
