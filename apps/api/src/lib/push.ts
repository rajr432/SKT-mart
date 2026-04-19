import webpush from "web-push";
import { prisma } from "./prisma";

// Web Push — VAPID keys required. If VAPID_* env vars are missing, push
// is silently no-op (sends are logged but don't throw). Generate keys:
//   npx web-push generate-vapid-keys

let configured = false;

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:no-reply@sktmart.online";
  if (!pub || !priv) {
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) {
    // eslint-disable-next-line no-console
    console.log(`[push:DRY] user=${userId} title="${payload.title}"`);
    return { sent: 0, failed: 0 };
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (e) {
        failed += 1;
        const statusCode = (e as { statusCode?: number }).statusCode;
        // 404/410 = subscription expired/revoked — remove so we don't
        // keep retrying a dead endpoint.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        } else {
          // eslint-disable-next-line no-console
          console.error(`[push] send failed for ${userId}: ${(e as Error).message}`);
        }
      }
    }),
  );
  return { sent, failed };
}
