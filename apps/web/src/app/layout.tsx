import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import Providers from "@/components/Providers";
import PushSubscribePrompt from "@/components/PushSubscribePrompt";
import LiveChatWidget from "@/components/LiveChatWidget";
import ScrollToTop from "@/components/ScrollToTop";
import AppUpdateBanner from "@/components/AppUpdateBanner";
import OfferStrip from "@/components/OfferStrip";
import CompareDrawer from "@/components/CompareDrawer";
import AnnouncementBar from "@/components/AnnouncementBar";
import ExitIntentPopup from "@/components/ExitIntentPopup";

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
  themeColor: "#2874f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col pb-[64px] md:pb-0">
        <Providers>
          <AnnouncementBar />
          <OfferStrip />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
          <InstallPrompt />
          <ServiceWorkerRegistrar />
          <PushSubscribePrompt />
          <LiveChatWidget />
          <ScrollToTop />
          <AppUpdateBanner />
          <CompareDrawer />
          <ExitIntentPopup />
        </Providers>
      </body>
    </html>
  );
}
