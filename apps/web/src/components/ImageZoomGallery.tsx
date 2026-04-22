"use client";

import { useEffect, useRef, useState } from "react";

interface Img {
  id: string;
  url: string;
  alt?: string | null;
}

export default function ImageZoomGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") setActive((a) => (a + 1) % images.length);
      else if (e.key === "ArrowLeft") setActive((a) => (a - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  if (!images.length) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        No image
      </div>
    );
  }

  const current = images[active];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div>
      <div
        ref={imgRef}
        className="relative aspect-square bg-white border rounded-lg overflow-hidden cursor-zoom-in group"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={onMove}
        onClick={() => setLightbox(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt ?? name}
          className="w-full h-full object-contain transition-transform duration-150"
          style={
            hover
              ? {
                  transform: `scale(2)`,
                  transformOrigin: `${pos.x}% ${pos.y}%`,
                }
              : undefined
          }
        />
        <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition">
          Click to zoom
        </span>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={im.id}
              src={im.url}
              alt={im.alt ?? ""}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`h-16 w-16 object-cover border rounded cursor-pointer shrink-0 transition ${
                active === i ? "border-brand ring-2 ring-brand/30" : "hover:border-brand"
              }`}
            />
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-75"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
          >
            &times;
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((a) => (a - 1 + images.length) % images.length);
                }}
              >
                &lsaquo;
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((a) => (a + 1) % images.length);
                }}
              >
                &rsaquo;
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt ?? name}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs">
            {active + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
