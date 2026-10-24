// Public origin of a request as the client saw it.
//
// Behind Fly's proxy (force_https) the app receives plain http, so
// `new URL(c.req.url).origin` is http://… even though every client connected
// over https. RFC 9728 values built from it (protected-resource `resource`,
// the WWW-Authenticate `resource_metadata` URL, the default OAuth `aud`) must
// carry the scheme the client used, so honor the first X-Forwarded-Proto hop.

import type { Context } from "hono";

export function publicOrigin(reqUrl: string, forwardedProto?: string | null): string {
  const url = new URL(reqUrl);
  const proto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`;
  return url.origin;
}

/**
 * Origin that serves the protected-resource metadata advertised in 401
 * challenges: the configured resource's origin when OAUTH_RESOURCE_URL is set
 * (so the challenge and the metadata always name the same resource), else the
 * request's public origin.
 */
export function metadataOrigin(
  reqUrl: string,
  forwardedProto: string | null | undefined,
  resourceUrl: string
): string {
  return resourceUrl ? new URL(resourceUrl).origin : publicOrigin(reqUrl, forwardedProto);
}

export function requestPublicOrigin(c: Context): string {
  return publicOrigin(c.req.url, c.req.header("X-Forwarded-Proto"));
}
