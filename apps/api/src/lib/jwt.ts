import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  role: Role;
  email?: string | null;
  phone?: string | null;
}

const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
