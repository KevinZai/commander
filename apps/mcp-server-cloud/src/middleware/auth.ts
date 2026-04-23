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

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or malformed Authorization header" }, 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return c.json({ error: "Empty bearer token" }, 401);
  }

  // Verify JWT
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string") {
      return c.json({ error: "Invalid token payload" }, 401);
    }
    payload = decoded;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "JWT verification failed");
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const userId = payload.sub;
  if (!userId) {
    return c.json({ error: "Token missing subject claim" }, 401);
  }

  // Lookup user in DB
  const { data: user, error } = await db
    .from("users")
    .select("user_id, tier, license_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId }, "User lookup failed");
    return c.json({ error: "Auth backend unavailable" }, 503);
  }

  if (!user) {
    logger.warn({ userId }, "User not found in DB");
    return c.json({ error: "User not found" }, 401);
  }

  // Runtime-validate tier instead of casting — DB could return any string and
  // silently break downstream entitlement logic (rate-limits, feature gates).
  const tier: "free" | "pro" = user.tier === "pro" ? "pro" : "free";
  if (user.tier !== "free" && user.tier !== "pro") {
    logger.warn({ userId, tier: user.tier }, "Unknown tier value from DB — defaulting to free");
  }

  c.set("auth", {
    userId: user.user_id,
    tier,
    licenseKey: user.license_key ?? token,
  });

  await next();
}
