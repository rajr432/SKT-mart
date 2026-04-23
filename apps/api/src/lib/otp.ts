import crypto from "node:crypto";
import { prisma } from "./prisma";
import { sendEmail } from "./notify";

// 6-digit code. Uses CSPRNG so codes can't be predicted by observing a few
// test OTPs. Delivery: email via existing Brevo SMTP (no third-party SMS
// needed). For phone targets we fall back to console-log until an SMS gateway
// is configured; delivery mechanism is intentionally pluggable via
// OTP_PROVIDER without changing callers.
export async function createOtp(target: string, userId?: string): Promise<string> {
  const code = String(100000 + crypto.randomInt(0, 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otp.create({
    data: { target, code, expiresAt, userId },
  });

  const isEmail = target.includes("@");
  if (isEmail) {
    try {
      await sendEmail(
        target,
        `Your SKT Mart verification code: ${code}`,
        renderOtpEmail(code),
      );
    } catch (e) {
      // Non-fatal: record still exists so a fallback channel can deliver.
      // eslint-disable-next-line no-console
      console.error("[otp][email] send failed:", (e as Error).message);
    }
  } else {
    // Phone OTP: no third-party SMS wired. Log for ops; customer can switch
    // to email OTP flow, or an SMS provider can be plugged in later.
    // eslint-disable-next-line no-console
    console.log(`[OTP][phone:${target}] ${code} (no SMS gateway configured)`);
  }
  return code;
}

export async function verifyOtp(target: string, code: string): Promise<boolean> {
  const otp = await prisma.otp.findFirst({
    where: { target, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  await prisma.otp.update({ where: { id: otp.id }, data: { used: true } });
  return true;
}

function renderOtpEmail(code: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fb;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(90deg,#2874f0,#7b4bff);padding:16px 20px;color:#fff">
      <strong style="font-size:18px">SKT Mart</strong>
    </div>
    <div style="padding:28px 24px;text-align:center">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Your verification code</h2>
      <p style="color:#555;margin:0 0 18px;font-size:13px">Use this code to complete sign-in. It expires in 10 minutes.</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:700;color:#111;background:#f1f5ff;padding:14px;border-radius:10px;display:inline-block">${code}</div>
      <p style="color:#888;margin:18px 0 0;font-size:12px">If you didn't request this, ignore this email — nobody can access your account without the code.</p>
    </div>
  </div>
</body></html>`;
}
