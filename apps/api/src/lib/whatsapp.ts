// WhatsApp sender — Meta Cloud API. If not configured (no
// WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID set), returns a
// click-to-chat `wa.me` URL instead so the admin / vendor can open it
// manually. Never throws — caller's flow must not depend on delivery.

const API_VERSION = "v21.0";

export interface WhatsAppResult {
  sent: boolean;
  waMeUrl: string;
  error?: string;
}

/** Normalize an Indian phone number into E.164 without `+` (Meta format). */
function normalize(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Already 12 digits starting with 91 → assume full E.164 (without +)
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // 10 digit Indian mobile — prefix 91
  if (digits.length === 10) return `91${digits}`;
  // 13+ digits (some users save with leading 0 or +) — best effort
  if (digits.length > 10) return digits;
  return null;
}

export function waMeLink(phone: string, message: string): string {
  const n = normalize(phone);
  const base = n ? `https://wa.me/${n}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
): Promise<WhatsAppResult> {
  const waMeUrl = waMeLink(phone, message);
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = normalize(phone);

  if (!token || !phoneNumberId) {
    // eslint-disable-next-line no-console
    console.log(`[whatsapp:DRY] to=${phone} → ${waMeUrl}`);
    return { sent: false, waMeUrl, error: "not_configured" };
  }
  if (!to) {
    return { sent: false, waMeUrl, error: "invalid_phone" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message, preview_url: true },
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      // eslint-disable-next-line no-console
      console.error(`[whatsapp] ${res.status}: ${errText.slice(0, 200)}`);
      return { sent: false, waMeUrl, error: `http_${res.status}` };
    }
    return { sent: true, waMeUrl };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[whatsapp] network error:", (e as Error).message);
    return { sent: false, waMeUrl, error: "network" };
  }
}
