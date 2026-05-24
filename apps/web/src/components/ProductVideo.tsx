"use client";

// Inline product video player. Supports:
// - YouTube (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...)
// - Vimeo (vimeo.com/123456)
// - Direct .mp4/.webm/.mov URLs
// Returns null for unrecognized URLs so a broken vendor paste doesn't crash
// the PDP.
export default function ProductVideo({ url }: { url?: string | null }) {
  if (!url) return null;
  const embed = toEmbed(url);
  if (!embed) return null;
  return (
    <div className="card p-4">
      <h2 className="font-semibold mb-3">Product video</h2>
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
        {embed.kind === "iframe" ? (
          <iframe
            src={embed.src}
            title="Product video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <video
            src={embed.src}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>
    </div>
  );
}

function toEmbed(raw: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube variants
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { kind: "iframe", src: `https://www.youtube.com/embed/${v}` };
      const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
      if (shorts) return { kind: "iframe", src: `https://www.youtube.com/embed/${shorts[1]}` };
      const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
      if (embed) return { kind: "iframe", src: `https://www.youtube.com/embed/${embed[1]}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    // Direct file
    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) {
      return { kind: "video", src: raw };
    }
    return null;
  } catch {
    return null;
  }
}
