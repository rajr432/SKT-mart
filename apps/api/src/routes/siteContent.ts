import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { audit } from "../lib/audit";

// Admin-editable content blocks. Known keys: "hero", "testimonials",
// "trustBadges", "announcement", "featureRow", "footerLinks". Unknown keys
// are also accepted so the editor can be extended without schema changes.
// Public GET returns the whole map so the storefront renders in one fetch.
const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.siteContent.findMany();
    const map: Record<string, unknown> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json({ content: map });
  } catch (e) {
    next(e);
  }
});

router.put(
  "/:key",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { key } = z.object({ key: z.string().min(1).max(64) }).parse(req.params);
      // Accept any JSON shape (array, object, string). Size limit enforced
      // at express.json() level to prevent runaway payloads.
      const value = req.body?.value ?? req.body;
      const row = await prisma.siteContent.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      await audit(req.user!.sub, "SITE_CONTENT_UPDATE", "SiteContent", key, { key });
      res.json({ item: row });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  "/:key",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      await prisma.siteContent.delete({ where: { key: req.params.key } }).catch(() => null);
      await audit(req.user!.sub, "SITE_CONTENT_DELETE", "SiteContent", req.params.key, {});
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
