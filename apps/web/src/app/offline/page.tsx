export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="container-page py-20 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-gray-600 mt-2">
        Check your connection. Cached pages may still work.
      </p>
    </div>
  );
}
