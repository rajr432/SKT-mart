"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui,-apple-system,sans-serif", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 24, margin: "12px 0" }}>Application error</h1>
          <p style={{ color: "#666", fontSize: 14 }}>
            A critical error occurred. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: 11, fontFamily: "monospace", marginTop: 8 }}>
              Ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 24px",
              background: "#2874f0",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
