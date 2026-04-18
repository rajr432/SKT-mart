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
}
