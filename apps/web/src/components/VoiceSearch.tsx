"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export default function VoiceSearch() {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const start = () => {
    if (typeof window === "undefined") return;
    const W = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice search is not supported on this browser");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e) => {
      const q = e.results[0]?.[0]?.transcript?.trim();
      if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <button
      type="button"
      onClick={start}
      title="Voice search"
      className={`px-2 h-full text-base ${
        listening ? "bg-red-500 text-white animate-pulse" : "text-gray-500 hover:text-brand"
      }`}
      aria-label="Voice search"
    >
      🎤
    </button>
  );
}
