import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

// Image storage: bytes live in Postgres (ImageAsset table), served via
// /api/images/:id. Render's free-tier disk is ephemeral (/tmp gets wiped
// on every restart), so on-disk uploads silently disappeared in production.
// DB-backed images are persistent with no third-party CDN required and are
// deduped by sha256 so re-uploading the same file reuses the existing row.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 10);
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error("Only images (jpg/png/webp/gif/svg/avif) allowed"));
    }
    cb(null, true);
  },
});

// Mounted at /api/upload
export const uploadRouter = Router();

uploadRouter.post(
  "/",
  requireAuth,
  upload.array("files", 8),
  async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }
      const base = `${req.protocol}://${req.get("host")}`;
      const urls: string[] = [];
      for (const f of files) {
        const sha256 = crypto.createHash("sha256").update(f.buffer).digest("hex");
        const asset = await prisma.imageAsset.upsert({
          where: { sha256 },
          create: {
            sha256,
            mimeType: f.mimetype,
            size: f.size,
            bytes: f.buffer,
            uploadedBy: req.user?.sub ?? null,
          },
          update: {},
          select: { id: true },
        });
        urls.push(`${base}/api/images/${asset.id}`);
      }
      res.json({ urls });
    } catch (e) {
      next(e);
    }
  },
);

// Mounted at /api/images
export const imagesRouter = Router();

imagesRouter.get("/:id", async (req, res, next) => {
  try {
    const asset = await prisma.imageAsset.findUnique({
      where: { id: req.params.id },
      select: { mimeType: true, bytes: true, sha256: true },
    });
    if (!asset) {
      res.status(404).send("Not found");
      return;
    }
    const etag = `"${asset.sha256}"`;
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.send(Buffer.from(asset.bytes));
  } catch (e) {
    next(e);
  }
});

export default uploadRouter;
