"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="container-page py-12 md:py-20">
      <div className="max-w-xl mx-auto text-center card p-8 flip-in">
        <div className="text-6xl mb-3">⚠️</div>
        <h1 className="text-2xl md:text-3xl font-semibold">Kuch galat ho gaya</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Hum is issue ko log kar chuke hain. Aap dobara try karo ya home pe wapas jao.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mt-2 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center mt-6">
          <button onClick={reset} className="btn-primary btn-3d px-5">Try again</button>
          <Link href="/" className="btn-primary btn-3d px-5 bg-gray-700">Go home</Link>
        </div>
      </div>
    </div>
  );
}
