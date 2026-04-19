"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Go to Account → Orders → click any order to see live tracking timeline.",
  },
  {
    q: "What is the return policy?",
    a: "7-day no-questions-asked returns. Full refund to wallet or source payment.",
  },
  {
    q: "How do I become a seller?",
    a: "Open /vendor/onboarding, apply, and pay ₹199 one-time lifetime fee.",
  },
  {
    q: "Is Cash on Delivery available?",
    a: "No, we only accept UPI / Cards / Netbanking via Razorpay and wallet.",
  },
];

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[80px] md:bottom-6 right-3 md:right-6 z-40 bg-brand text-white rounded-full h-12 w-12 md:h-14 md:w-14 shadow-xl flex items-center justify-center text-xl hover:scale-110 transition"
        aria-label="Help chat"
      >
        💬
      </button>
      {open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-3 md:right-6 z-40 w-[320px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-brand text-white px-4 py-3">
            <div className="font-semibold">SKT Mart Help</div>
            <div className="text-xs opacity-80">We usually reply within minutes</div>
          </div>
          <div className="p-3 max-h-[300px] overflow-y-auto space-y-2">
            {FAQS.map((f, i) => (
              <details key={i} className="bg-gray-50 rounded p-2 text-sm">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-gray-600 mt-1 text-xs">{f.a}</p>
              </details>
            ))}
          </div>
          <a
            href="mailto:support@sktmart.online"
            className="block bg-gray-100 text-center text-sm py-2 border-t hover:bg-gray-200"
          >
            Email support@sktmart.online
          </a>
        </div>
      )}
    </>
  );
}
