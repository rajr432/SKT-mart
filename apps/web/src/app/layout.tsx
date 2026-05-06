import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import OfferStrip from "@/components/OfferStrip";
import AnnouncementBar from "@/components/AnnouncementBar";
import DeferredWidgets from "@/components/DeferredWidgets";

export const metadata: Metadata = {
  title: {
    default: "SKT Mart — Shop Smart, Live Better",
    template: "%s | SKT Mart",
  },
  description:
    "Shop electronics, fashion, home, books and more from trusted sellers on SKT Mart. Fast delivery, easy returns, secure payments.",
  keywords: ["SKT Mart", "e-commerce", "India", "multi-vendor", "online shopping"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SKT Mart",
  },
  icons: {
    icon: [{ url: "/logo.jpg" }, { url: "/logo-256.png", sizes: "256x256" }],
    apple: [{ url: "/logo.jpg" }],
  },
  openGraph: {
    title: "SKT Mart — Shop Smart, Live Better",
    description:
      "India's trusted multi-vendor marketplace. Electronics, Fashion, Home, Books & more.",
    siteName: "SKT Mart",
    images: ["/logo-256.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SKT Mart — Shop Smart, Live Better",
    images: ["/logo-256.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

// Eager DNS+TLS to the API origin so the first XHR pays no handshake cost.
// Helps perceived "first click" latency a lot on cold visits.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "https://skt-mart-api.onrender.com").origin;
  } catch {
    return "";
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <head>
        {API_ORIGIN ? (
          <>
            <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={API_ORIGIN} />
          </>
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <AnnouncementBar />
          <OfferStrip />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
          <DeferredWidgets />
        </Providers>
      </body>
    </html>
  );
}
