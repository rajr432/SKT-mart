import Razorpay from "razorpay";
import crypto from "node:crypto";

let client: Razorpay | null = null;

export function getRazorpay(): Razorpay | null {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  client = new Razorpay({ key_id, key_secret });
  return client;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Constant-time compare: JS `===` short-circuits on first mismatch and
  // leaks character-by-character timing, allowing an attacker to iteratively
  // brute-force the HMAC across many rate-limited probes. Compare as UTF-8
  // bytes (not hex-decoded) so a malformed hex signature with non-[0-9a-f]
  // chars is rejected cleanly by the length check rather than silently
  // truncating via Buffer.from(..., "hex"). Length pre-check is required —
  // timingSafeEqual throws on unequal-length buffers.
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}
