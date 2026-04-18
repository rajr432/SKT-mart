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

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*",
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "skt-mart-api", time: new Date().toISOString() });
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

// Sitemap & robots
app.get("/sitemap.xml", async (_req, res) => {
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
  res.set("Content-Type", "application/xml");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>`,
  );
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${process.env.PUBLIC_URL ?? "https://sktmart.com"}/sitemap.xml\n`);
});

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[skt-mart-api] listening on http://localhost:${port}`);
});
