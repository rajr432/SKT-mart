"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[140px] md:bottom-24 left-3 md:left-6 z-30 h-10 w-10 rounded-full bg-white shadow-lg border border-gray-200 text-lg hover:scale-110 transition"
      title="Scroll to top"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}
