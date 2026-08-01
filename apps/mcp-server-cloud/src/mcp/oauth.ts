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
// Supabase `users` row the /v1 license-key path uses — by `sub` claim
// (users.user_id UUID) first, then by `email` claim (users.email). The issuer
// Kevin configures MUST mint tokens carrying one of those claims.
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
export async function resolveOAuthSubject(payload: JWTPayload): Promise<AuthContext | null> {
  const sub = payload.sub;
  if (sub && UUID_RE.test(sub)) {
    const { data: user, error } = await db
      .from("users")
      .select("user_id, tier, license_key")
      .eq("user_id", sub)
      .maybeSingle();
    if (error) {
      logger.error({ err: error, sub }, "OAuth subject lookup by user_id failed");
    } else if (user) {
      return {
        userId: user.user_id,
        tier: normalizeTier(user.tier),
        licenseKey: user.license_key ?? sub,
      };
    }
  }

  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (email) {
    const { data: user, error } = await db
      .from("users")
      .select("user_id, tier, license_key")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      logger.error({ err: error }, "OAuth subject lookup by email failed");
    } else if (user) {
      return {
        userId: user.user_id,
        tier: normalizeTier(user.tier),
        licenseKey: user.license_key ?? email,
      };
    }
  }

  logger.warn({ hasSub: Boolean(sub), hasEmail: Boolean(email) }, "OAuth token not linked to a user");
  return null;
}
