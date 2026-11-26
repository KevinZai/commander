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
// Supabase `users` row the /v1 license-key path uses, ONLY through the
// oauth_identities table (migration 005) keyed by the token's (iss, sub).
// There is no fallback to `sub` = users.user_id or to the `email` claim: an
// unlinked identity, a missing table or any lookup error denies the token.
//
// Inert until OAUTH_ISSUER_URL is set. See PAYWALL.md for the full config.

import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
import { env } from "../lib/env.js";
import { db } from "../db/client.js";
import { logger } from "../lib/logger.js";
import { normalizeTier, type AuthContext } from "../middleware/auth.js";


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

type IdentityLookup = (issuer: string, subject: string) => Promise<{ user_id: string } | null>;
type UserLookup = (userId: string) => Promise<{ user_id: string; tier: unknown; license_key: string | null } | null>;

export type OAuthSubjectDeps = {
  findIdentity: IdentityLookup;
  findUser: UserLookup;
};

const supabaseSubjectDeps: OAuthSubjectDeps = {
  async findIdentity(issuer, subject) {
    const { data, error } = await db
      .from("oauth_identities")
      .select("user_id")
      .eq("issuer", issuer)
      .eq("subject", subject)
      .maybeSingle();
    // Includes a missing table (migration 005 not applied): deny.
    if (error) throw new Error(`oauth_identities lookup failed (${error.code ?? "unknown"})`);
    return data ? { user_id: String(data.user_id) } : null;
  },
  async findUser(userId) {
    const { data, error } = await db
      .from("users")
      .select("user_id, tier, license_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`users lookup failed (${error.code ?? "unknown"})`);
    return data ?? null;
  },
};

/**
 * Map a verified issuer token to a CC Commander user record — the same
 * records /v1 Bearer license keys resolve to — through oauth_identities only.
 * Returns null (deny) for a token without iss/sub, an unlinked identity, or
 * any lookup failure.
 */
export async function resolveOAuthSubject(
  payload: JWTPayload,
  deps: OAuthSubjectDeps = supabaseSubjectDeps
): Promise<AuthContext | null> {
  const issuer = typeof payload.iss === "string" ? payload.iss : "";
  const subject = typeof payload.sub === "string" ? payload.sub : "";
  if (!issuer || !subject || issuer.length > 512 || subject.length > 512) {
    logger.warn({ hasIss: Boolean(issuer), hasSub: Boolean(subject) }, "OAuth token missing iss/sub");
    return null;
  }

  try {
    const identity = await deps.findIdentity(issuer, subject);
    if (!identity) {
      logger.warn("OAuth identity not linked to a user");
      return null;
    }
    const user = await deps.findUser(identity.user_id);
    if (!user) {
      logger.warn("OAuth identity links to a missing user");
      return null;
    }
    return {
      userId: user.user_id,
      tier: normalizeTier(user.tier),
      licenseKey: user.license_key ?? `oauth:${issuer}#${subject}`,
    };
  } catch (err) {
    logger.error({ err: (err as Error).message }, "OAuth subject resolution failed; denying");
    return null;
  }
}
