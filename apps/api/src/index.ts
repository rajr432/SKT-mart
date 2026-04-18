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

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[skt-mart-api] listening on http://localhost:${port}`);
});
