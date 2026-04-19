import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { signJwt } from "../lib/jwt";
import { createOtp, verifyOtp } from "../lib/otp";
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
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });
    if (user) {
      // Link googleId on first Google login if only email matched
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            emailVerified: email_verified ? true : user.emailVerified,
            avatar: user.avatar ?? picture ?? null,
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: name ?? "Google User",
          email,
          googleId,
          emailVerified: email_verified ?? false,
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
  role: z.enum(["CUSTOMER", "VENDOR"]).default("CUSTOMER"),
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
        role: body.role,
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
