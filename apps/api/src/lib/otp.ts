import { prisma } from "./prisma";

export async function createOtp(target: string, userId?: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otp.create({
    data: { target, code, expiresAt, userId },
  });

  // Stub: log to console. In production wire Firebase / Twilio / MSG91.
  if (process.env.OTP_PROVIDER === "stub" || !process.env.OTP_PROVIDER) {
    console.log(`[OTP][${target}] ${code}`);
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
