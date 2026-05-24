"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  from: "bot" | "user";
  text: string;
  ts: number;
}

/** Rule-based FAQ matcher. Scores by keyword overlap and returns the best
 * match above a small threshold, else falls back to "contact support". */
const KB: { keys: string[]; reply: string; link?: { label: string; href: string } }[] = [
  {
    keys: ["track", "order", "status", "shipped", "delivery", "where", "dispatch"],
    reply: "Apne sab orders Account → Orders mein dikhege. Har order ka real-time tracking timeline hai (Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered). Status change hone pe email + notification dono aate hain.",
    link: { label: "Open my orders", href: "/account/orders" },
  },
  {
    keys: ["return", "refund", "exchange", "replace"],
    reply: "7-day no-questions-asked returns. Refund 2-4 business days mein SKT Wallet mein aata hai (instant withdraw to bank). Return ke liye Orders → apna order → 'Return' button.",
    link: { label: "Return policy", href: "/return-policy" },
  },
  {
    keys: ["cancel", "cancellation"],
    reply: "Order cancel sirf PLACED ya CONFIRMED stage tak kar sakte ho. Orders → apna order → 'Cancel'. Refund turant wallet mein credit ho jata hai.",
    link: { label: "My orders", href: "/account/orders" },
  },
  {
    keys: ["payment", "pay", "upi", "card", "razorpay", "wallet", "netbanking"],
    reply: "Accepted: UPI, Credit/Debit Card, Netbanking (Razorpay ke through), aur SKT Wallet. COD discontinued. All payments are 100% secure with SSL + Razorpay PCI-DSS.",
  },
  {
    keys: ["seller", "vendor", "sell", "register", "shop", "store"],
    reply: "Seller banne ke liye ₹199 one-time lifetime fee. Koi monthly fee nahi. Commission sirf ₹499+ products pe 10% auto-cut.",
    link: { label: "Become a seller", href: "/vendor/onboarding" },
  },
  {
    keys: ["coupon", "discount", "offer", "code", "promo"],
    reply: "Naye users ke liye WELCOME10 (10% off first order). All coupons checkout pe apply karo. Refer a friend se ₹100 wallet credit milta hai.",
    link: { label: "View coupons", href: "/deals" },
  },
  {
    keys: ["shipping", "ship", "charge", "delivery charge", "free"],
    reply: "₹500+ order pe free delivery. Otherwise ₹40 shipping charge. Standard delivery 3-7 days (pincode dependent). Express delivery metro cities mein 1-2 days.",
    link: { label: "Shipping policy", href: "/shipping-policy" },
  },
  {
    keys: ["wallet", "balance", "recharge", "add money", "credit"],
    reply: "SKT Wallet mein paisa add karo to fast checkout + instant refunds. Account → Wallet → Add Money. Refunds automatically wallet mein jate hain.",
    link: { label: "My wallet", href: "/account/wallet" },
  },
  {
    keys: ["gift", "card", "voucher"],
    reply: "Gift cards ₹100 se ₹10,000 tak available. Email se delivery. Recipient ko code milega jo checkout pe apply kar sakte hain.",
    link: { label: "Buy gift card", href: "/account/giftcards" },
  },
  {
    keys: ["coin", "point", "reward", "loyalty"],
    reply: "SKT Coins har purchase pe milte hain (1 coin per ₹10 spent). 100 coins = ₹10 discount on next order.",
    link: { label: "My SKT Coins", href: "/account/loyalty" },
  },
  {
    keys: ["refer", "friend", "invite"],
    reply: "Friend ko refer karo — dono ko ₹100 wallet credit (friend ke first order pe). Referral link Account → Refer & Earn mein milega.",
    link: { label: "Refer & Earn", href: "/account/referral" },
  },
  {
    keys: ["password", "login", "account", "forgot", "otp", "sign in"],
    reply: "Login ke liye email + password ya Google Sign-In use karo. Password bhul gaye? Login page pe 'Forgot password' click karo OTP ke through reset ke liye.",
    link: { label: "Login", href: "/login" },
  },
  {
    keys: ["address", "pincode", "deliver", "location"],
    reply: "Delivery addresses Account → Addresses mein add/edit karo. 29,000+ pincodes covered across India.",
    link: { label: "My addresses", href: "/account" },
  },
  {
    keys: ["product", "stock", "available", "out of stock", "sold"],
    reply: "Agar product out-of-stock hai, PDP pe 'Notify me' button aayega — stock aate hi email + push notification milega.",
  },
  {
    keys: ["hi", "hello", "hey", "namaste", "hola"],
    reply: "Namaste! Main SKT Mart ka support bot hoon. Kisi bhi topic pe poochho — orders, returns, payment, seller registration, wallet, delivery, anything 🤝",
  },
];

function matchKB(input: string): { reply: string; link?: { label: string; href: string } } | null {
  const q = input.toLowerCase();
  let best: { score: number; entry: (typeof KB)[0] } | null = null;
  for (const entry of KB) {
    const score = entry.keys.reduce((s, k) => (q.includes(k) ? s + k.length : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { score, entry };
  }
  return best ? { reply: best.entry.reply, link: best.entry.link } : null;
}

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "Namaste! Main SKT Mart ka support bot hoon 🤖\nKoi bhi sawaal poochho — orders, returns, payment, delivery, seller registration, wallet — main help karunga. Agar zaroorat ho to sktmart25@gmail.com pe email bhi kar sakte ho.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  const send = (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw) return;
    setMsgs((m) => [...m, { from: "user", text: raw, ts: Date.now() }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const hit = matchKB(raw);
      const reply = hit
        ? hit.reply
        : "Mujhe exact answer nahi pata 🙏 — humari support team se directly connect karo: sktmart25@gmail.com pe email karo ya 1800-000-0000 pe call karo. Team <12 hours mein reply karti hai.";
      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text: reply + (hit?.link ? `\n\n→ ${hit.link.label}: ${hit.link.href}` : ""),
          ts: Date.now(),
        },
      ]);
      setTyping(false);
    }, 400 + Math.min(800, raw.length * 10));
  };

  const quickReplies = ["Track my order", "Return policy", "Payment options", "Become a seller", "Refund status"];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[78px] md:bottom-6 right-3 md:right-6 z-40 h-11 w-11 md:h-12 md:w-12 rounded-full grid place-items-center transition-all hover:scale-105 glass text-accent border border-white/40 shadow-lg"
        style={{ backdropFilter: "saturate(180%) blur(16px)", WebkitBackdropFilter: "saturate(180%) blur(16px)" }}
        aria-label="Help chat"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
      {open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-3 md:right-6 z-40 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ height: "520px", maxHeight: "calc(100vh - 180px)" }}>
          <div className="bg-gradient-to-br from-accent to-pink-500 text-white px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 bg-white/20 rounded-full flex items-center justify-center text-lg">🤖</div>
            <div className="flex-1">
              <div className="font-semibold">SKT Assistant</div>
              <div className="text-xs opacity-90 flex items-center gap-1">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span> Online now
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-xl" aria-label="Close">✕</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.from === "user" ? "bg-brand text-white rounded-br-sm" : "bg-white border border-gray-200 rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  <span className="inline-block animate-bounce">●</span>
                  <span className="inline-block animate-bounce ml-1" style={{ animationDelay: "0.15s" }}>●</span>
                  <span className="inline-block animate-bounce ml-1" style={{ animationDelay: "0.3s" }}>●</span>
                </div>
              </div>
            )}
          </div>
          {msgs.length <= 2 && (
            <div className="px-3 py-2 flex flex-wrap gap-1 border-t bg-white">
              {quickReplies.map((q) => (
                <button key={q} onClick={() => send(q)} className="text-xs bg-blue-50 text-brand px-2 py-1 rounded-full hover:bg-blue-100">
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="p-2 border-t bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your question..."
              className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/50"
              autoFocus
            />
            <button
              onClick={() => send()}
              className="bg-brand text-white rounded-full h-9 w-9 flex items-center justify-center hover:bg-brand-dark"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
          <a
            href="mailto:sktmart25@gmail.com?subject=SKT%20Mart%20Support"
            className="block bg-gray-100 text-center text-xs py-2 border-t hover:bg-gray-200 text-gray-700"
          >
            Still need help? Email sktmart25@gmail.com
          </a>
        </div>
      )}
    </>
  );
}
