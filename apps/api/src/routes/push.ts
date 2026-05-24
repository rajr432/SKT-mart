import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getVapidPublicKey } from "../lib/push";

const router = Router();

// Public — frontend needs this to call PushManager.subscribe
router.get("/public-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

router.post("/subscribe", requireAuth, async (req, res, next) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: {
        userId: req.user!.sub,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
      },
      create: {
        userId: req.user!.sub,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
      },
    });
    res.json({ subscription: { id: sub.id } });
  } catch (e) {
    next(e);
  }
});

router.post("/unsubscribe", requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint, userId: req.user!.sub } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
