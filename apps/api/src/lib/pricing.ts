import { prisma } from "./prisma";
import { getSettings } from "./settings";

export interface CartLine {
  productId: string;
  price: number;
  mrp: number;
  quantity: number;
  // Optional — used to scope vendor coupons. When absent we fall back to a
  // single Prisma roundtrip to hydrate it from productId.
  vendorId?: string;
}

export interface PriceBreakup {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shippingFee: number;
  tax: number;
  total: number;
}

export async function computePrice(
  lines: CartLine[],
  couponCode?: string,
  pincode?: string,
): Promise<PriceBreakup> {
  const settings = await getSettings();
  const subtotal = lines.reduce((s, l) => s + l.mrp * l.quantity, 0);
  const sellingTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = subtotal - sellingTotal;

  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    const now = new Date();
    if (
      coupon &&
      coupon.active &&
      // Honour scheduled activation — a coupon with a future startsAt must
      // not be usable yet. Schema defaults startsAt to now(), so a row only
      // fails this check when an admin explicitly set a future date.
      coupon.startsAt <= now &&
      (!coupon.expiresAt || coupon.expiresAt > now) &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    ) {
      // Vendor-scoped coupons apply only to the subset of lines sold by the
      // coupon's vendor. Platform-wide coupons (vendorId null) keep the
      // full-cart behaviour. We hydrate missing vendorIds with a single
      // batched query so callers can pass cart lines without pre-joining.
      let scopedLines: CartLine[] = lines;
      if (coupon.vendorId) {
        const missing = lines.filter((l) => !l.vendorId).map((l) => l.productId);
        const vendorByProductId = new Map<string, string>();
        if (missing.length) {
          const rows = await prisma.product.findMany({
            where: { id: { in: missing } },
            select: { id: true, vendorId: true },
          });
          for (const r of rows) vendorByProductId.set(r.id, r.vendorId);
        }
        scopedLines = lines.filter((l) => {
          const vid = l.vendorId ?? vendorByProductId.get(l.productId);
          return vid === coupon.vendorId;
        });
      }
      const scopedTotal = scopedLines.reduce((s, l) => s + l.price * l.quantity, 0);
      if (scopedTotal >= coupon.minOrder && scopedTotal > 0) {
        const raw =
          coupon.type === "PERCENT"
            ? Math.floor((scopedTotal * coupon.value) / 100)
            : coupon.value;
        const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
        // Clamp to the scoped subtotal — a FLAT coupon with value > scoped
        // cart must not produce a couponDiscount larger than the items it
        // applies to. Otherwise `Order.discount = discount + couponDiscount`
        // (orders.ts) balloons past subtotal and breaks analytics / CSV
        // exports / admin dashboards.
        couponDiscount = Math.min(capped, scopedTotal);
      }
    }
  }

  // Clamp to 0 — a FLAT coupon whose `value` exceeds the selling total
  // must not drive net/tax negative. Otherwise WALLET payments with a
  // negative `amountPaise` would INCREMENT the user's wallet balance
  // (gte guard trivially passes, decrement of negative = addition).
  const netAfterCoupon = Math.max(0, sellingTotal - couponDiscount);
  const shippingFee = netAfterCoupon >= settings.freeShippingMin ? 0 : settings.shippingFee;

  // Admin-configurable tax. Applied on net-after-coupon (pre-shipping).
  const tax = Math.round((netAfterCoupon * settings.taxPercent) / 100);

  let pincodeAdjust = 0;
  if (pincode) {
    const p = await prisma.pincode.findUnique({ where: { pincode } });
    if (p && !p.serviceable) {
      pincodeAdjust = 0;
    }
  }

  const total = netAfterCoupon + shippingFee + tax + pincodeAdjust;

  return { subtotal, discount, couponDiscount, shippingFee, tax, total };
}
