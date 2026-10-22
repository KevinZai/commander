// Bearer auth for the /mcp streamable-HTTP endpoint.
//
// Accepts, in order:
//   1. CC Commander license JWTs (HS256, JWT_SECRET) — the exact tokens the
//      /v1 Bearer path accepts, resolved via the shared resolveLicenseToken().
//   2. Access tokens from the external OAuth 2.1 issuer (OAUTH_ISSUER_URL),
//      verified against its JWKS and mapped to the same user records.
//
// 401 responses carry a WWW-Authenticate challenge with `resource_metadata`
// per RFC 9728 §5.1 so MCP clients can discover the authorization server.

import type { Context, Next } from "hono";
import { resolveLicenseToken } from "../middleware/auth.js";
import { oauthConfigured, resolveOAuthSubject, verifyOAuthAccessToken } from "./oauth.js";

function challenge(c: Context, description: string, errorCode?: string): Response {
  const origin = new URL(c.req.url).origin;
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource`;
  const parts = ['Bearer realm="cc-commander"'];
  if (errorCode) {
    parts.push(`error="${errorCode}"`, `error_description="${description}"`);
  }
  parts.push(`resource_metadata="${metadataUrl}"`);
  c.header("WWW-Authenticate", parts.join(", "));
  return c.json({ error: description }, 401);
}

export async function mcpAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return challenge(c, "Missing bearer token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return challenge(c, "Missing bearer token");
  }

  // 1. License JWT — same key records as the /v1 Bearer path.
  const licensed = await resolveLicenseToken(token);
  if (licensed.ok) {
    c.set("auth", licensed.auth);
    return next();
  }
  if (licensed.status === 503) {
    return c.json({ error: licensed.error }, 503);
  }

  // 2. External OAuth issuer token (when configured).
  if (oauthConfigured()) {
    const origin = new URL(c.req.url).origin;
    const payload = await verifyOAuthAccessToken(token, origin);
    if (payload) {
      const auth = await resolveOAuthSubject(payload);
      if (auth) {
        c.set("auth", auth);
        return next();
      }
      return challenge(c, "Token subject not linked to a CC Commander account", "invalid_token");
    }
  }

  return challenge(c, "Invalid or expired token", "invalid_token");
}
