export type Role = "CUSTOMER" | "VENDOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  avatar?: string | null;
  vendor?: Vendor | null;
}

export interface Vendor {
  id: string;
  storeName: string;
  slug: string;
  description?: string | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  rating: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  image?: string | null;
  description?: string | null;
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand?: string | null;
  sku: string;
  mrp: number;
  price: number;
  stock: number;
  fAssured: boolean;
  rating: number;
  ratingCount: number;
  images: ProductImage[];
  vendor?: { storeName: string; slug: string; id?: string; rating?: number };
  category?: Category;
  specs?: Record<string, any> | null;
  reviews?: Review[];
  videoUrl?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  images: string[];
  verified: boolean;
  createdAt: string;
  user?: { name: string; avatar?: string | null };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
  product?: { images: ProductImage[] };
}

export interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  placedAt: string;
  items: OrderItem[];
  address: Address;
  payment?: { status: string; method: string };
}

export interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string | null;
  position: number;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrder: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  active: boolean;
  usageLimit?: number | null;
  usedCount?: number;
}

export interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: string;
  amountPaise: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  productId: string;
  name: string;
  budgetPaise: number;
  spentPaise: number;
  bidPaise: number;
  startsAt: string;
  endsAt?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "REJECTED";
  impressions: number;
  clicks: number;
  conversions: number;
  keyword?: string | null;
  product?: { name: string; images: ProductImage[] };
}

export interface Payout {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  totalCommission: number;
  totalRefunds: number;
  totalAdSpend: number;
  netAmount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  utr?: string | null;
  paidAt?: string | null;
  vendor?: { storeName: string; slug: string };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  rmaNumber: string;
  orderId: string;
  reason: string;
  description?: string | null;
  refundMode: string;
  status: string;
  refundPaise: number;
  createdAt: string;
  items: Array<{ id: string; productId: string; quantity: number; refundPaise: number }>;
}

export interface AppSettings {
  commissionPercent: number;
  commissionThreshold: number;
  commissionPercentBelow: number;
  freeShippingMin: number;
  shippingFee: number;
  taxPercent: number;
  loyaltyEarnPer100: number;
  loyaltyValuePaise: number;
  loyaltyMaxRedeemPct: number;
  referralBonusPaise: number;
  adMinBudgetPaise: number;
  adClickCostPaise: number;
  adImpressionCostPaise: number;
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  emiEnabled?: boolean;
  emiMinAmountPaise?: number;
  emiTenures?: number[];
  emiInterestPercent?: number;
  exitIntentCouponCode?: string;
  exitIntentMessage?: string;
  announcementBar?: string;
  announcementLink?: string | null;
  codEnabled?: boolean;
  codMaxOrderPaise?: number;
  codFeePaise?: number;
  returnWindowDays?: number;
  walletCashbackTiers?: Array<{ minPaise: number; cashbackPaise: number }>;
  brandLogo?: string | null;
  brandFavicon?: string | null;
  brandPrimary?: string;
  brandAccent?: string;
  brandDark?: string;
  footerAddress?: string;
  footerGstin?: string;
  footerCopyright?: string;
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialTwitter?: string | null;
  socialYoutube?: string | null;
  socialWhatsapp?: string | null;
  payRazorpayEnabled?: boolean;
  payWalletEnabled?: boolean;
  payUpiEnabled?: boolean;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroCtaText?: string | null;
  heroCtaLink?: string | null;
}
