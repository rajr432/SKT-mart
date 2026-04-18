import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }
  const e = err as { status?: number; message?: string };
  const status = e.status ?? 500;
  console.error("[error]", err);
  res.status(status).json({ error: e.message ?? "Internal server error" });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
