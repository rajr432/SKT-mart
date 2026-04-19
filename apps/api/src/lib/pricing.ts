import { prisma } from "./prisma";
import { getSettings } from "./settings";

export interface CartLine {
  productId: string;
  price: number;
  mrp: number;
  quantity: number;
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
      sellingTotal >= coupon.minOrder &&
      // Honour scheduled activation — a coupon with a future startsAt must
      // not be usable yet. Schema defaults startsAt to now(), so a row only
      // fails this check when an admin explicitly set a future date.
      coupon.startsAt <= now &&
      (!coupon.expiresAt || coupon.expiresAt > now) &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    ) {
      const raw =
        coupon.type === "PERCENT"
          ? Math.floor((sellingTotal * coupon.value) / 100)
          : coupon.value;
      const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
      // Clamp to sellingTotal — a FLAT coupon with value > cart total must
      // not produce a couponDiscount larger than the cart itself. Otherwise
      // `Order.discount = discount + couponDiscount` (orders.ts) balloons
      // past subtotal and breaks analytics / CSV exports / admin dashboards.
      couponDiscount = Math.min(capped, sellingTotal);
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
