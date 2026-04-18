import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { db } from "../db/client.js";
import { logger } from "../lib/logger.js";

export type AuthContext = {
  userId: string;
  tier: "free" | "pro";
  licenseKey: string;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    c.status(401);
    c.json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // Verify JWT
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  } catch (err) {
    logger.warn({ err }, "JWT verification failed");
    c.status(401);
    c.json({ error: "Invalid or expired token" });
    return;
  }

  const userId = payload.sub;
  if (!userId) {
    c.status(401);
    c.json({ error: "Token missing subject claim" });
    return;
  }

  // Lookup user in DB
  const { data: user, error } = await db
    .from("users")
    .select("user_id, tier, license_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !user) {
    logger.warn({ userId, error }, "User not found in DB");
    c.status(401);
    c.json({ error: "User not found" });
    return;
  }

  c.set("auth", {
    userId: user.user_id,
    tier: user.tier as "free" | "pro",
    licenseKey: user.license_key ?? token,
  });

  await next();
}
