import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { signJwt } from "../lib/jwt";
import { createOtp, verifyOtp } from "../lib/otp";
import { sendEmail } from "../lib/notify";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error";

const router = Router();

const googleClient = new OAuth2Client();

// Google sign-in: client obtains an ID token (via @react-oauth/google
// GoogleLogin component), posts it here; we verify the token with
// Google's public keys, then either link it to an existing user
// (matching email) or create a new one. Issue our own JWT like login.
router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = z.object({ idToken: z.string().min(20) }).parse(req.body);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new HttpError(503, "Google sign-in not configured");
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new HttpError(401, "Invalid Google token");
    }
    const { sub: googleId, email, name, picture, email_verified } = payload;
    // Account-takeover guard: only match/link by email if Google has verified
    // it. Otherwise an attacker with an unverified Google Workspace email
    // claiming a victim's email could log in as the victim.
    const orClauses: Array<{ googleId: string } | { email: string }> = [{ googleId }];
    if (email_verified) orClauses.push({ email });
    let user = await prisma.user.findFirst({ where: { OR: orClauses } });
    if (user) {
      // Link googleId on first Google login only when the matching email is
      // verified by Google (or when we already matched on googleId itself).
      if (!user.googleId && email_verified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            emailVerified: true,
            avatar: user.avatar ?? picture ?? null,
          },
        });
      }
    } else {
      // Refuse to create an account with an unverified email — forces the
      // attacker to actually own the email address before signup.
      if (!email_verified) throw new HttpError(401, "Google email not verified");
      user = await prisma.user.create({
        data: {
          name: name ?? "Google User",
          email,
          googleId,
          emailVerified: true,
          avatar: picture ?? null,
        },
      });
    }
    const token = signJwt({ sub: user.id, role: user.role, email: user.email, phone: user.phone });
    res.json({ token, user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(6),
  // Role is intentionally NOT accepted from the client. Self-registration
  // always creates a CUSTOMER. Becoming a VENDOR requires the paid onboarding
  // flow (/api/vendor/apply + /api/vendor/pay-registration/*), which upgrades
  // the user's role only after the ₹199 lifetime fee is settled. Without this
  // restriction, a client could send `role: "VENDOR"` and skip the fee.
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    if (!body.email && !body.phone) {
      throw new HttpError(400, "Email or phone required");
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (existing) throw new HttpError(409, "Account already exists");

    const password = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        password,
        role: "CUSTOMER",
      },
    });
    const token = signJwt({ sub: user.id, role: user.role, email: user.email, phone: user.phone });
    res.status(201).json({ token, user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (!user?.password) throw new HttpError(401, "Invalid credentials");
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, "Invalid credentials");
    const token = signJwt({ sub: user.id, role: user.role, email: user.email, phone: user.phone });
    res.json({ token, user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

// ========== PASSWORD RESET ==========
//
// Flow:
//   1) POST /forgot-password  { identifier }
//      → always returns 200 (don't leak which emails exist). If a user
//        with that email/phone exists, a one-time 64-hex token is generated,
//        stored on the user (hashed isn't necessary since we check via
//        unique lookup + short TTL), and an email link is sent.
//   2) GET  /reset-password/:token/valid  → 200 if still valid, 410 otherwise
//   3) POST /reset-password  { token, password }
//      → validates token + expiry, sets new password hash, clears token.

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { identifier } = z
      .object({ identifier: z.string().min(3) })
      .parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (user?.email) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });
      const web = process.env.WEB_URL ?? "https://sktmart.vercel.app";
      const link = `${web}/reset-password?token=${token}`;
      await sendEmail(
        user.email,
        "Reset your SKT Mart password",
        `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fb;margin:0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(90deg,#2874f0,#7b4bff);padding:16px 20px;color:#fff">
              <strong style="font-size:18px">SKT Mart</strong>
            </div>
            <div style="padding:24px">
              <h2 style="margin:0 0 8px;font-size:20px;color:#111">Reset your password</h2>
              <p style="color:#444;line-height:1.55;font-size:14px">
                Hi ${escapeHtmlSafe(user.name)}, we received a request to reset your SKT Mart password.
                Click the button below within 30 minutes to choose a new one.
              </p>
              <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 22px;background:linear-gradient(90deg,#2874f0,#7b4bff);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password →</a>
              <p style="color:#777;font-size:12px;margin-top:16px">If you didn't request this, ignore this email. Your password will stay the same.</p>
            </div>
            <div style="padding:12px 20px;border-top:1px solid #eee;color:#888;font-size:12px">
              Need help? Contact support at <a style="color:#2874f0" href="mailto:sktmart25@gmail.com">sktmart25@gmail.com</a>
            </div>
          </div>
        </body></html>`,
      );
    }
    res.json({ ok: true, message: "If an account exists, a reset link has been sent." });
  } catch (e) {
    next(e);
  }
});

router.get("/reset-password/:token/valid", async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: req.params.token,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });
    if (!user) throw new HttpError(410, "Reset link expired or invalid");
    res.json({ ok: true, email: user.email });
  } catch (e) {
    next(e);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = z
      .object({ token: z.string().min(10), password: z.string().min(6) })
      .parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user) throw new HttpError(410, "Reset link expired or invalid");
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    res.json({ ok: true, message: "Password updated. You can log in now." });
  } catch (e) {
    next(e);
  }
});

function escapeHtmlSafe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/otp/request", async (req, res, next) => {
  try {
    const { target } = z.object({ target: z.string().min(5) }).parse(req.body);
    await createOtp(target);
    res.json({ ok: true, message: "OTP sent" });
  } catch (e) {
    next(e);
  }
});

router.post("/otp/verify", async (req, res, next) => {
  try {
    const { target, code, name } = z
      .object({ target: z.string(), code: z.string().length(6), name: z.string().optional() })
      .parse(req.body);
    const ok = await verifyOtp(target, code);
    if (!ok) throw new HttpError(401, "Invalid or expired OTP");

    const isEmail = target.includes("@");
    let user = await prisma.user.findFirst({
      where: isEmail ? { email: target } : { phone: target },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name ?? "Customer",
          email: isEmail ? target : undefined,
          phone: isEmail ? undefined : target,
          emailVerified: isEmail,
          phoneVerified: !isEmail,
        },
      });
    }
    const token = signJwt({ sub: user.id, role: user.role, email: user.email, phone: user.phone });
    res.json({ token, user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { vendor: true },
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: sanitize(user) });
  } catch (e) {
    next(e);
  }
});

function sanitize<T extends { password?: string | null }>(u: T) {
  const { password: _password, ...rest } = u;
  return rest;
}

export default router;
