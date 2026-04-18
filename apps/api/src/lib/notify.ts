import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  // Stub: also hook SMS/Email here in production
  // eslint-disable-next-line no-console
  console.log(`[NOTIFY:${type}] -> ${userId}: ${title}`);
  return prisma.notification.create({
    data: { userId, type, title, body, link },
  });
}
