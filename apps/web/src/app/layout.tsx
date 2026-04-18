import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "SKT Mart — India's Multi-Vendor Marketplace",
  description:
    "Shop electronics, fashion, home, books and more from trusted sellers on SKT Mart. Fast delivery, easy returns, secure payments.",
  keywords: ["SKT Mart", "e-commerce", "India", "multi-vendor", "online shopping"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
