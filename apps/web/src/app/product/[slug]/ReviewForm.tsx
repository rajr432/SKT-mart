"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ReviewForm({ productId }: { productId: string }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { urls: string[] };
      setImages((prev) => [...prev, ...data.urls]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await api("/api/reviews", {
        token,
        method: "POST",
        json: { productId, rating, title, comment, images },
      });
      setDone(true);
      setTitle("");
      setComment("");
      setImages([]);
      setTimeout(() => router.refresh(), 600);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !user) {
    return (
      <div className="card p-4 text-sm text-gray-600">
        <a href="/login" className="text-brand font-medium">
          Log in
        </a>{" "}
        to write a review with photos.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h3 className="font-semibold">Rate &amp; Review this product</h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-yellow-500" : "text-gray-300"}`}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
      <input
        className="input"
        placeholder="Review title (e.g. Great product!)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input"
        placeholder="Share your experience in detail…"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div>
        <label className="block text-sm mb-1 font-medium">Add photos (optional, up to 8)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onUpload}
          disabled={uploading || images.length >= 8}
          className="text-sm"
        />
        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        {images.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {images.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-16 w-16 object-cover border rounded"
                />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                  aria-label="remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {done && <p className="text-green-700 text-sm">Thanks for your review!</p>}
      <button type="submit" className="btn-primary" disabled={submitting || uploading}>
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
