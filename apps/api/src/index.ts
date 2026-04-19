import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import rateLimit from "express-rate-limit";

import { errorHandler } from "./middleware/error";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import categoriesRouter from "./routes/categories";
import cartRouter from "./routes/cart";
import wishlistRouter from "./routes/wishlist";
import addressRouter from "./routes/addresses";
import orderRouter from "./routes/orders";
import reviewRouter from "./routes/reviews";
import couponRouter from "./routes/coupons";
import bannerRouter from "./routes/banners";
import pincodeRouter from "./routes/pincodes";
import vendorRouter from "./routes/vendor";
import adminRouter from "./routes/admin";
import paymentRouter from "./routes/payments";
import uploadRouter from "./routes/upload";
import searchRouter from "./routes/search";
import settingsRouter from "./routes/settings";
import walletRouter from "./routes/wallet";
import adsRouter from "./routes/ads";
import payoutsRouter from "./routes/payouts";
import returnsRouter from "./routes/returns";
import notificationsRouter from "./routes/notifications";
import loyaltyRouter from "./routes/loyalty";
import referralRouter from "./routes/referral";
import giftcardsRouter from "./routes/giftcards";
import qaRouter from "./routes/qa";
import alertsRouter from "./routes/alerts";
import recentlyRouter from "./routes/recently";
import compareRouter from "./routes/compare";
import pushRouter from "./routes/push";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    // `||` (not `??`) so an empty / whitespace-only env var falls back to
    // the hardcoded allowlist instead of `[]` (which would block every
    // browser origin and silently brick the API).
    origin:
      (process.env.CORS_ORIGIN ?? process.env.CLIENT_ORIGIN)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .length
        ? (process.env.CORS_ORIGIN ?? process.env.CLIENT_ORIGIN)!
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [
            "https://sktmart.online",
            "https://www.sktmart.online",
            "https://sktmart.vercel.app",
            "https://web-ra-ram.vercel.app",
            "http://localhost:3000",
          ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(
  "/uploads",
  express.static(path.resolve(process.env.UPLOAD_DIR ?? "./uploads")),
);

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ ok: true, service: "skt-mart-api", time: new Date().toISOString() });
});

// Root landing — clarifies this host is the API; points browsers to the web app.
const htmlAttrEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

app.get("/", (_req, res) => {
  const rawUrl = process.env.WEB_URL ?? "https://web-ra-ram.vercel.app";
  // Only allow http(s) URLs; reject javascript:/data: schemes even if an
  // operator mis-sets WEB_URL. Fall back to the public web app if invalid.
  const webUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://web-ra-ram.vercel.app";
  const safeUrl = htmlAttrEscape(webUrl);
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SKT Mart API</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e6edf3;display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{max-width:640px;padding:40px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
    h1{margin:0 0 8px;font-size:28px;background:linear-gradient(90deg,#ffd814,#ff9900);-webkit-background-clip:text;background-clip:text;color:transparent}
    p{margin:8px 0;color:#9aa7b8;line-height:1.55}
    .btn{display:inline-block;margin-top:18px;padding:12px 22px;background:linear-gradient(90deg,#2874f0,#7b4bff);color:#fff;text-decoration:none;border-radius:10px;font-weight:600}
    code{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;font-size:12px}
    ul{color:#9aa7b8;font-size:13px;line-height:1.8;padding-left:18px}
  </style>
</head>
<body>
  <div class="card">
    <h1>SKT Mart — Backend API</h1>
    <p>Ye backend hai. User-facing shopping site kholne ke liye neeche click karo 👇</p>
    <a class="btn" href="${safeUrl}">Open SKT Mart Web App →</a>
    <p style="margin-top:24px;font-size:13px">Endpoints: <code>/health</code>, <code>/api/products</code>, <code>/api/categories</code>, <code>/api/auth/login</code>, <code>/sitemap.xml</code></p>
    <ul>
      <li>Status: <code>${new Date().toISOString()}</code></li>
      <li>Docs: all routes under <code>/api/*</code></li>
    </ul>
  </div>
</body></html>`);
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/orders", orderRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/banners", bannerRouter);
app.use("/api/pincodes", pincodeRouter);
app.use("/api/vendor", vendorRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/search", searchRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/ads", adsRouter);
app.use("/api/payouts", payoutsRouter);
app.use("/api/returns", returnsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/referral", referralRouter);
app.use("/api/giftcards", giftcardsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/recently-viewed", recentlyRouter);
app.use("/api/compare", compareRouter);
app.use("/api/push", pushRouter);

// Sitemap & robots
app.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const { prisma } = await import("./lib/prisma");
    const products = await prisma.product.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    const cats = await prisma.category.findMany({ select: { slug: true } });
    const base = process.env.PUBLIC_URL ?? "https://sktmart.com";
    const urls = [
      `${base}/`,
      `${base}/about`,
      `${base}/contact`,
      `${base}/privacy-policy`,
      `${base}/return-policy`,
      `${base}/terms`,
      `${base}/shipping-policy`,
      `${base}/refund-policy`,
      ...cats.map((c) => `${base}/category/${c.slug}`),
      ...products.map((p) => `${base}/product/${p.slug}`),
    ];
    const escXml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    res.set("Content-Type", "application/xml");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${escXml(u)}</loc></url>`)
        .join("\n")}\n</urlset>`,
    );
  } catch (e) {
    next(e);
  }
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${process.env.PUBLIC_URL ?? "https://sktmart.com"}/sitemap.xml\n`);
});

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[skt-mart-api] listening on http://localhost:${port}`);
});
