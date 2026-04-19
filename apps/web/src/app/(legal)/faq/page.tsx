export const metadata = { title: "FAQ — SKT Mart" };

const FAQS: { q: string; a: string }[] = [
  { q: "How do I track my order?", a: "Go to Account → Orders → click any order. You'll see a real-time timeline (Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered). Email + push notification is sent at every status change." },
  { q: "What payment methods are accepted?", a: "UPI, Credit/Debit Card, Netbanking (via Razorpay), and SKT Wallet. Cash on Delivery is not available — all payments are secured with SSL + Razorpay PCI-DSS." },
  { q: "What is your return policy?", a: "7-day no-questions-asked returns on most products. Refund lands in SKT Wallet within 2-4 business days (instant withdrawal to bank supported)." },
  { q: "How do I cancel an order?", a: "Go to Account → Orders → open the order → click Cancel. Allowed only while order is in PLACED or CONFIRMED state. Refund is credited instantly to SKT Wallet." },
  { q: "How much is shipping?", a: "Free delivery on orders ₹500+. Otherwise a flat ₹40 shipping fee. Standard delivery 3-7 days; metro pincodes often see 1-2 day express delivery." },
  { q: "How do I become a seller on SKT Mart?", a: "Go to Sell on SKT Mart → apply → pay the one-time ₹199 lifetime fee. No monthly subscription. Only 10% commission, charged only on products priced ₹499+." },
  { q: "How does SKT Wallet work?", a: "SKT Wallet is your in-app balance. Add money via Razorpay, use it for faster checkout, and all refunds are instantly credited back into it. You can also withdraw the balance to your bank." },
  { q: "What are SKT Coins?", a: "You earn 1 SKT Coin for every ₹10 spent. 100 coins = ₹10 discount on a future order. Coins never expire and apply automatically at checkout if you opt in." },
  { q: "Do you have gift cards?", a: "Yes — ₹100 to ₹10,000 denominations, delivered instantly by email. Recipient gets a unique code redeemable on any product." },
  { q: "How do I refer a friend?", a: "Account → Refer & Earn → share your link. When your friend completes their first order, both of you get ₹100 wallet credit." },
  { q: "How do I contact support?", a: "Email sktmart25@gmail.com (24×7, avg reply under 12 hours), or use the chat bubble at the bottom-right of any page for instant FAQ support." },
  { q: "Is my data safe?", a: "Yes. We use SSL encryption end-to-end, never store raw card details (handled by Razorpay PCI-DSS infrastructure), and follow strict Indian DPDP Act data-privacy norms. Read our Privacy Policy for details." },
  { q: "Can I change my delivery address after placing an order?", a: "You can change the address only while the order is in PLACED state. After CONFIRMED, please contact the vendor directly from the order page or cancel + reorder." },
  { q: "What happens if a product is damaged on arrival?", a: "Take a photo within 48 hours of delivery and raise a return from Orders → the specific order → Return with photo. Our team will review and refund within 2-4 business days." },
  { q: "Can I buy in bulk for my business?", a: "Yes. Email sktmart25@gmail.com with your requirements — we offer custom pricing for bulk orders (10+ units of the same SKU)." },
];

export default function FAQPage() {
  return (
    <div className="container-page py-6">
      <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-600 mb-6">Quick answers to the most common questions. Still stuck? Email <a href="mailto:sktmart25@gmail.com" className="text-brand underline">sktmart25@gmail.com</a>.</p>
      <div className="space-y-2">
        {FAQS.map((f, i) => (
          <details key={i} className="card p-4 group">
            <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
              <span>{f.q}</span>
              <span className="text-brand group-open:rotate-180 transition">▾</span>
            </summary>
            <p className="text-gray-700 mt-3 text-sm leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
