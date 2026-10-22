import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { db } from "../db/client.js";
import { logger } from "../lib/logger.js";
import type { AccountTier } from "../lib/paywall.js";

export type AuthContext = {
  userId: string;
  tier: AccountTier;
  licenseKey: string;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/** Runtime-validate tier instead of casting — DB could return any string and
 *  silently break downstream entitlement logic (rate-limits, feature gates). */
export function normalizeTier(raw: unknown): AccountTier {
  if (raw === "pro") return "pro";
  if (raw === "founders") return "founders";
  return "free";
}

export type ResolveTokenResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Verify a CC Commander license JWT (HS256, JWT_SECRET) and resolve it to the
 * user/tier record it maps to. Shared by the /v1 Bearer path (authMiddleware)
 * and the /mcp OAuth resource-server path — both transports resolve tokens to
 * the SAME key records. Behavior (status codes + error strings) is identical
 * to the original inline authMiddleware implementation.
 */
export async function resolveLicenseToken(token: string): Promise<ResolveTokenResult> {
  // Verify JWT
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string") {
      return { ok: false, status: 401, error: "Invalid token payload" };
    }
    payload = decoded;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "JWT verification failed");
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const userId = payload.sub;
  if (!userId) {
    return { ok: false, status: 401, error: "Token missing subject claim" };
  }

  // Lookup user in DB
  const { data: user, error } = await db
    .from("users")
    .select("user_id, tier, license_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId }, "User lookup failed");
    return { ok: false, status: 503, error: "Auth backend unavailable" };
  }

  if (!user) {
    logger.warn({ userId }, "User not found in DB");
    return { ok: false, status: 401, error: "User not found" };
  }

  const tier = normalizeTier(user.tier);
  if (user.tier !== "free" && user.tier !== "pro" && user.tier !== "founders") {
    logger.warn({ userId, tier: user.tier }, "Unknown tier value from DB — defaulting to free");
  }

  return {
    ok: true,
    auth: {
      userId: user.user_id,
      tier,
      licenseKey: user.license_key ?? token,
    },
  };
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

  const resolved = await resolveLicenseToken(token);
  if (!resolved.ok) {
    return c.json({ error: resolved.error }, resolved.status);
  }

  c.set("auth", resolved.auth);

  await next();
}
