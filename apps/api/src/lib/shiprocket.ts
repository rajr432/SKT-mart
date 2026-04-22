/**
 * Shiprocket API integration.
 *
 * Env vars required:
 *   SHIPROCKET_EMAIL    — Shiprocket account email
 *   SHIPROCKET_PASSWORD — Shiprocket account password
 *
 * If not configured, all functions are no-ops so the app runs fine without it.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiry = 0;

function isConfigured(): boolean {
  return !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
}

async function getToken(): Promise<string | null> {
  if (!isConfigured()) return null;
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[shiprocket] auth failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { token: string };
  cachedToken = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days (token valid 10 days)
  return cachedToken;
}

async function srFetch(path: string, method: string, body?: unknown) {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[shiprocket] ${method} ${path} failed:`, data);
    return null;
  }
  return data;
}

export interface ShiprocketOrderPayload {
  order_id: string;
  order_date: string; // YYYY-MM-DD HH:mm
  pickup_location?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_state?: string;
  shipping_country?: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

/**
 * Create an order on Shiprocket. Returns Shiprocket's order_id + shipment_id,
 * or null if Shiprocket is not configured or the call fails.
 */
export async function createShiprocketOrder(
  payload: ShiprocketOrderPayload,
): Promise<{ order_id: number; shipment_id: number; status: string } | null> {
  return srFetch("/orders/create/adhoc", "POST", payload) as Promise<{
    order_id: number;
    shipment_id: number;
    status: string;
  } | null>;
}

/**
 * Get tracking data for a shipment.
 */
export async function trackShipment(
  shipmentId: number,
): Promise<Record<string, unknown> | null> {
  return srFetch(`/courier/track/shipment/${shipmentId}`, "GET") as Promise<Record<
    string,
    unknown
  > | null>;
}

/**
 * Get available courier services for a shipment.
 */
export async function checkServiceability(
  pickupPincode: string,
  deliveryPincode: string,
  weight: number,
): Promise<unknown> {
  return srFetch(
    `/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=0`,
    "GET",
  );
}

/**
 * Cancel a Shiprocket order.
 */
export async function cancelShiprocketOrder(
  orderIds: number[],
): Promise<unknown> {
  return srFetch("/orders/cancel", "POST", { ids: orderIds });
}

export { isConfigured as isShiprocketConfigured };
