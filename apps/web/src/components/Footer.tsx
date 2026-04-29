import Link from "next/link";
import { api } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

// Server component: pulls admin-editable branding/footer/social from
// /api/settings/public so non-engineering can edit copy without a redeploy.
// Falls back to sane defaults if the call fails (e.g. cold backend).
export default async function Footer() {
  const s = await api<Partial<AppSettings>>("/api/settings/public").catch(
    () => ({}) as Partial<AppSettings>,
  );
  const siteName = s.siteName || "SKT Mart";
  const supportEmail = s.supportEmail || "sktmart25@gmail.com";
  const supportPhone = s.supportPhone || "1800-000-0000";
  const address = s.footerAddress || "SKT Mart Internet Private Limited";
  const gstin = s.footerGstin || "";
  const copyright =
    s.footerCopyright || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
  const dark = s.brandDark || "#172337";
  const social: Array<[string, string | null | undefined, string]> = [
    ["Facebook", s.socialFacebook, "📘"],
    ["Instagram", s.socialInstagram, "📷"],
    ["Twitter", s.socialTwitter, "🐦"],
    ["YouTube", s.socialYoutube, "▶️"],
    ["WhatsApp", s.socialWhatsapp, "💬"],
  ];

  return (
    <footer className="text-gray-300 mt-10" style={{ backgroundColor: dark }}>
      <div className="container-page pt-8 flex items-center gap-3">
        <span className="bg-white rounded-md p-2 inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.brandLogo || "/logo.jpg"} alt={siteName} className="h-10 w-auto" />
        </span>
        <div>
          <p className="text-white text-lg font-semibold italic leading-tight">{siteName}</p>
          <p className="text-xs italic text-gray-400">Shop Smart, Live Better</p>
        </div>
      </div>
      <div className="container-page py-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">About</h4>
          <ul className="space-y-2">
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/vendor/onboarding">Sell on {siteName}</Link></li>
            <li><Link href="/track">Track Orders</Link></li>
            <li><a href={`mailto:${supportEmail}`}>Support Email</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Help</h4>
          <ul className="space-y-2">
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/return-policy">Returns</Link></li>
            <li><Link href="/shipping-policy">Shipping</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/help">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Consumer Policy</h4>
          <ul className="space-y-2">
            <li><Link href="/return-policy">Return Policy</Link></li>
            <li><Link href="/terms">Terms of Use</Link></li>
            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/refund-policy">Refund Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Support</h4>
          <p className="text-xs leading-5">
            <a href={`mailto:${supportEmail}`} className="text-white font-medium">{supportEmail}</a><br />
            Phone: {supportPhone}<br />
            24×7 email support<br />
            Avg response: &lt;12 hours
          </p>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Registered Office</h4>
          <p className="text-xs leading-5 whitespace-pre-line">
            {address}
            {gstin ? <><br />GSTIN: {gstin}</> : null}
            <br />Email: <a href={`mailto:${supportEmail}`} className="text-white">{supportEmail}</a>
            <br />Phone: {supportPhone}
          </p>
          {social.some(([, url]) => url) && (
            <div className="flex gap-3 mt-3 text-lg">
              {social.map(([label, url, icon]) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="opacity-80 hover:opacity-100"
                  >
                    {icon}
                  </a>
                ) : null,
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-gray-700/60">
        <div className="container-page py-4 text-xs flex flex-wrap items-center gap-4 justify-between">
          <span>{copyright}</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/return-policy">Returns</Link>
            <Link href="/refund-policy">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
