// OAuth 2.1 resource-server token verification for the /mcp endpoint.
//
// DESIGN (resource-server-only, per the MCP authorization spec):
// This server does NOT run its own authorization server. It advertises an
// external issuer via RFC 9728 protected-resource metadata
// (/.well-known/oauth-protected-resource, served from index.ts) and validates
// access tokens that issuer mints. Clients (e.g. ChatGPT's connector flow)
// discover the issuer from the metadata, run authorization-code + PKCE
// against it, and present the resulting Bearer token here.
//
// Token → key-record mapping: a verified external token resolves to the SAME
// Supabase `users` row the /v1 license-key path uses, in this order:
//   1. an existing (iss, sub) binding in public.oauth_identities;
//   2. `sub` equal to users.user_id (an issuer that mints our user ids);
//   3. `email` equal to users.email, ONLY when the issuer asserts
//      email_verified = true (Codex audit #09: an issuer that admits
//      unverified email must not be able to link someone else's account).
// A successful 2/3 match records the (iss, sub) binding, so later tokens
// resolve by issuer + subject and an email change at the issuer cannot
// re-point the account.
//
// Inert until OAUTH_ISSUER_URL is set. See PAYWALL.md for the full config.

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
import { env } from "../lib/env.js";
import { db } from "../db/client.js";
import { logger } from "../lib/logger.js";
import { normalizeTier, type AuthContext } from "../middleware/auth.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Asymmetric JWS algorithms an external issuer would use. HS* tokens are
// license JWTs (already tried before this path) — never sent to the JWKS
// verifier, which also avoids network fetches for obviously-local tokens.
const ASYMMETRIC_ALG_RE = /^(RS|ES|PS)\d{3}$|^EdDSA$/;

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

export function oauthConfigured(): boolean {
  return Boolean(env.oauthIssuerUrl);
}

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) {
    const url = env.oauthJwksUrl || new URL("/.well-known/jwks.json", env.oauthIssuerUrl).href;
    jwksCache = createRemoteJWKSet(new URL(url));
  }
  return jwksCache;
}

/** Expected `aud`: explicit override, else the canonical resource URL. */
export function expectedAudience(requestOrigin: string): string {
  return env.oauthAudience || env.oauthResourceUrl || `${requestOrigin}/mcp`;
}

/**
 * Verify an access token from the configured external issuer.
 * Returns the JWT payload, or null when the token is not an issuer token
 * (wrong alg, no issuer configured) or fails verification.
 */
export async function verifyOAuthAccessToken(
  token: string,
  requestOrigin: string
): Promise<JWTPayload | null> {
  if (!oauthConfigured()) return null;

  // Cheap pre-filter: only asymmetric-signed JWTs go to the remote JWKS.
  try {
    const header = decodeProtectedHeader(token);
    if (!header.alg || !ASYMMETRIC_ALG_RE.test(header.alg)) return null;
  } catch {
    return null; // not a JWT at all
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: env.oauthIssuerUrl,
      audience: expectedAudience(requestOrigin),
    });
    return payload;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "OAuth access token verification failed");
    return null;
  }
}

/**
 * Map a verified issuer token to a CC Commander user record — the same
 * records /v1 Bearer license keys resolve to.
 */
type OAuthUserRow = { user_id: string; tier: string | null; license_key: string | null };

function toAuth(user: OAuthUserRow, fallbackKey: string): AuthContext {
  return {
    userId: user.user_id,
    tier: normalizeTier(user.tier),
    licenseKey: user.license_key ?? fallbackKey,
  };
}

/** OIDC `email_verified` is a boolean; some issuers send the string "true". */
export function emailIsVerified(payload: JWTPayload): boolean {
  return payload.email_verified === true || payload.email_verified === "true";
}

async function userBy(column: "user_id" | "email", value: string): Promise<OAuthUserRow | null> {
  const { data, error } = await db
    .from("users")
    .select("user_id, tier, license_key")
    .eq(column, value)
    .maybeSingle();
  if (error) {
    logger.error({ err: error }, `OAuth subject lookup by ${column} failed`);
    return null;
  }
  return (data as OAuthUserRow | null) ?? null;
}

async function boundUserId(issuer: string, subject: string): Promise<string | null> {
  const { data, error } = await db
    .from("oauth_identities")
    .select("user_id")
    .eq("issuer", issuer)
    .eq("subject", subject)
    .maybeSingle();
  if (error) {
    // Missing table (migration not applied) or backend error: fall through to
    // the verified-claim paths, which never weaken the checks below.
    logger.warn({ err: error }, "oauth_identities lookup failed");
    return null;
  }
  return (data as { user_id: string } | null)?.user_id ?? null;
}

async function bindIdentity(issuer: string, subject: string, userId: string): Promise<void> {
  const { error } = await db
    .from("oauth_identities")
    .upsert(
      { issuer, subject, user_id: userId },
      { onConflict: "issuer,subject", ignoreDuplicates: true }
    );
  if (error) logger.warn({ err: error, userId }, "oauth_identities bind failed (non-fatal)");
}

export async function resolveOAuthSubject(payload: JWTPayload): Promise<AuthContext | null> {
  const sub = typeof payload.sub === "string" && payload.sub ? payload.sub : undefined;
  // jwtVerify already pinned `iss` to the configured issuer.
  const iss = typeof payload.iss === "string" && payload.iss ? payload.iss : env.oauthIssuerUrl;

  // 1. Established issuer + subject binding.
  if (sub) {
    const boundId = await boundUserId(iss, sub);
    if (boundId) {
      const user = await userBy("user_id", boundId);
      if (user) return toAuth(user, sub);
      logger.warn({ boundId }, "OAuth binding points at a missing user");
      return null;
    }
  }

  // 2. Issuer mints CC Commander user ids as `sub`.
  if (sub && UUID_RE.test(sub)) {
    const user = await userBy("user_id", sub);
    if (user) {
      await bindIdentity(iss, sub, user.user_id);
      return toAuth(user, sub);
    }
  }

  // 3. Email, only when the issuer vouches that the address is verified.
  const email = typeof payload.email === "string" && payload.email ? payload.email : undefined;
  if (email && !emailIsVerified(payload)) {
    logger.warn({ hasSub: Boolean(sub) }, "OAuth email not verified by issuer; refusing email linking");
  } else if (email) {
    const user = await userBy("email", email);
    if (user) {
      if (sub) await bindIdentity(iss, sub, user.user_id);
      return toAuth(user, email);
    }
  }

  logger.warn({ hasSub: Boolean(sub), hasEmail: Boolean(email) }, "OAuth token not linked to a user");
  return null;
}
