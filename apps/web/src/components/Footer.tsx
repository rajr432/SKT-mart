import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#172337] text-gray-300 mt-10">
      <div className="container-page pt-8 flex items-center gap-3">
        <span className="bg-white rounded-md p-2 inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="SKT Mart" className="h-10 w-auto" />
        </span>
        <div>
          <p className="text-white text-lg font-semibold italic leading-tight">SKT Mart</p>
          <p className="text-xs italic text-gray-400">Shop Smart, Live Better</p>
        </div>
      </div>
      <div className="container-page py-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">About</h4>
          <ul className="space-y-2">
            <li><Link href="/about">Contact Us</Link></li>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/vendor/onboarding">Careers / Sell</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Help</h4>
          <ul className="space-y-2">
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/return-policy">Returns</Link></li>
            <li><Link href="/shipping-policy">Shipping</Link></li>
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
          <h4 className="text-gray-400 uppercase text-xs mb-3">Mail Us</h4>
          <p className="text-xs leading-5">
            SKT Mart Internet Private Limited,<br />
            Block A, 4th Floor,<br />
            Tower 1, Cyber Corridor,<br />
            Bengaluru, Karnataka 560103
          </p>
        </div>
        <div>
          <h4 className="text-gray-400 uppercase text-xs mb-3">Registered Office</h4>
          <p className="text-xs leading-5">
            SKT Mart Internet Private Limited,<br />
            CIN: U51109KA2025PTC000000<br />
            Email: support@sktmart.com<br />
            Phone: 1800-000-0000
          </p>
        </div>
      </div>
      <div className="border-t border-gray-700/60">
        <div className="container-page py-4 text-xs flex flex-wrap items-center gap-4 justify-between">
          <span>© {new Date().getFullYear()} SKT Mart. All rights reserved.</span>
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
