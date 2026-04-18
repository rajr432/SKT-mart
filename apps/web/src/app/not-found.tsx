import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl font-semibold">404 — Page not found</h1>
      <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      <Link href="/" className="btn-primary inline-block mt-4">
        Back to Home
      </Link>
    </div>
  );
}
