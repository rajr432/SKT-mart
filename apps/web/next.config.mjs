/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Smaller client bundle: tree-shake big icon/util packages.
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "lucide-react",
      "react-icons",
      "date-fns",
    ],
  },
  // Compiler can drop console.* calls in prod (smaller bundle, less main-thread).
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
    minimumCacheTTL: 60,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Long-cache for hashed Next.js static assets (immutable by build hash).
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public images / logos under /public — cache for a day, allow re-validation.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
