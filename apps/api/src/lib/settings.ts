import { prisma } from "./prisma";

export async function getSettings() {
  let s = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!s) {
    s = await prisma.appSettings.create({ data: { id: "default" } });
  }
  return s;
}

export async function patchSettings(patch: Record<string, unknown>) {
  await getSettings();
  return prisma.appSettings.update({
    where: { id: "default" },
    data: patch as never,
  });
}
