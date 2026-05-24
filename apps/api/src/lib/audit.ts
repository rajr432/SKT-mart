import { prisma } from "./prisma";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
) {
  return prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      action,
      entity,
      entityId,
      metadata: metadata as never,
      ipAddress,
    },
  });
}
