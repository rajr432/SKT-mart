import { prisma } from "./prisma";

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
  const subtotal = lines.reduce((s, l) => s + l.mrp * l.quantity, 0);
  const sellingTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = subtotal - sellingTotal;

  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    if (
      coupon &&
      coupon.active &&
      sellingTotal >= coupon.minOrder &&
      (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    ) {
      const raw =
        coupon.type === "PERCENT"
          ? Math.floor((sellingTotal * coupon.value) / 100)
          : coupon.value;
      couponDiscount = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    }
  }

  // Free shipping above 49900 paise (₹499), else ₹4900 paise (₹49).
  const shippingFee = sellingTotal - couponDiscount >= 49900 ? 0 : 4900;

  // 0% tax (prices assumed inclusive). Hook to compute GST if needed.
  const tax = 0;

  let pincodeAdjust = 0;
  if (pincode) {
    const p = await prisma.pincode.findUnique({ where: { pincode } });
    if (p && !p.serviceable) {
      pincodeAdjust = 0;
    }
  }

  const total = sellingTotal - couponDiscount + shippingFee + tax + pincodeAdjust;

  return { subtotal, discount, couponDiscount, shippingFee, tax, total };
}
