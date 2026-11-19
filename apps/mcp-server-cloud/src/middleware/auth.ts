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
 * the SAME key records.
 *
 * Token claims: `sub` = users.user_id, optional `kv` = users.license_key_version
 * (migration 006). No code in this repo mints license tokens; they are signed
 * out-of-band with JWT_SECRET. A minted token must carry the row's current
 * kv; a token whose kv (or missing kv, read as 1) differs is "Token revoked".
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

  // `kv` (license key version) must be a positive integer when present.
  const tokenVersion = payload.kv;
  if (tokenVersion !== undefined && !(Number.isInteger(tokenVersion) && (tokenVersion as number) >= 1)) {
    return { ok: false, status: 401, error: "Invalid token payload" };
  }

  // Lookup user in DB
  const { data: user, error } = await db
    .from("users")
    .select("user_id, tier, license_key, license_key_version")
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

  // Stale-token check (migration 006). Rotating a key increments
  // users.license_key_version; a token is valid only for the current version.
  // Tokens minted before versioning carry no kv and count as version 1.
  const currentVersion = Number.isInteger(user.license_key_version) ? (user.license_key_version as number) : 1;
  if ((tokenVersion ?? 1) !== currentVersion) {
    logger.warn({ userId }, "License token version is stale");
    return { ok: false, status: 401, error: "Token revoked" };
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
