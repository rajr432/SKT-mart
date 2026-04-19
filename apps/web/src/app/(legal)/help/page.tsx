import Link from "next/link";

export const metadata = { title: "Help Center — SKT Mart" };

const TOPICS: { icon: string; label: string; href: string; desc: string }[] = [
  { icon: "📦", label: "Orders & Tracking", href: "/account/orders", desc: "Check order status, track shipment, view invoices." },
  { icon: "↩️", label: "Returns & Refunds", href: "/return-policy", desc: "Start a return, check refund status, 7-day policy." },
  { icon: "💳", label: "Payments & Wallet", href: "/account/wallet", desc: "UPI, Card, Netbanking, Wallet balance, refunds." },
  { icon: "🏪", label: "Sell on SKT Mart", href: "/vendor/onboarding", desc: "Become a seller — ₹199 one-time, 10% commission." },
  { icon: "🎁", label: "Gift Cards", href: "/account/giftcards", desc: "Buy, redeem, and share gift cards." },
  { icon: "🪙", label: "SKT Coins & Rewards", href: "/account/loyalty", desc: "Earn coins on every purchase." },
  { icon: "🎉", label: "Coupons & Offers", href: "/deals", desc: "Best deals, coupon codes, festival offers." },
  { icon: "🚚", label: "Shipping & Delivery", href: "/shipping-policy", desc: "Charges, timelines, serviceable pincodes." },
  { icon: "🛡️", label: "Safety & Security", href: "/privacy-policy", desc: "How we protect your data and payments." },
  { icon: "❓", label: "FAQs", href: "/faq", desc: "Answers to the most-asked questions." },
  { icon: "📬", label: "Contact Support", href: "/contact", desc: "Email, phone, chat — multiple ways to reach us." },
  { icon: "📝", label: "Terms & Policies", href: "/terms", desc: "Terms of use, privacy, return, refund policies." },
];

export default function HelpPage() {
  return (
    <div className="container-page py-6">
      <div className="card p-6 bg-gradient-to-br from-[#2874f0]/10 to-[#7b4bff]/10 mb-6">
        <h1 className="text-3xl font-bold mb-1">How can we help?</h1>
        <p className="text-gray-600">Need something specific? Email <a href="mailto:sktmart25@gmail.com" className="text-brand underline">sktmart25@gmail.com</a> — we reply within 12 hours. For instant help, tap the 💬 chat bubble.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TOPICS.map((t) => (
          <Link key={t.href} href={t.href} className="card p-4 hover:shadow-lg transition group">
            <div className="text-3xl mb-2">{t.icon}</div>
            <div className="font-semibold text-sm mb-1 group-hover:text-brand">{t.label}</div>
            <div className="text-xs text-gray-500 leading-snug">{t.desc}</div>
          </Link>
        ))}
      </div>
      <div className="card p-5 mt-6 text-center">
        <div className="font-semibold mb-1">Still need help?</div>
        <div className="text-sm text-gray-600 mb-3">Our team is available 24×7 via email. Typical response time &lt; 12 hours.</div>
        <div className="flex flex-wrap justify-center gap-2">
          <a href="mailto:sktmart25@gmail.com" className="btn-primary">📧 Email Us</a>
          <a href="tel:18000000000" className="btn-outline">📞 1800-000-0000</a>
          <Link href="/contact" className="btn-outline">📝 Contact Form</Link>
        </div>
      </div>
    </div>
  );
}
