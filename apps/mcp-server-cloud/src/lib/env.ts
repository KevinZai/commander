// Runtime env validation — fail fast if required vars are absent.
// Secrets are NEVER hardcoded here. They are injected at runtime via:
//   op run --env-file=.op.env -- node dist/index.js
// or Fly.io secrets set (populated by Kevin, see CC-311).

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "JWT_SECRET",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL!,
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
  jwtSecret: process.env.JWT_SECRET!,
  posthogKey: process.env.POSTHOG_API_KEY ?? "",
  metricsAuthToken: process.env.METRICS_AUTH_TOKEN ?? "",
  openaiAppsChallengeToken: process.env.OPENAI_APPS_CHALLENGE_TOKEN ?? "",
  // ── OAuth 2.1 resource-server config for the /mcp streamable-HTTP endpoint.
  // All optional: when OAUTH_ISSUER_URL is unset, /mcp accepts only CC Commander
  // license JWTs (same records as /v1 Bearer) and the protected-resource
  // metadata omits authorization_servers. See PAYWALL.md + docs/compat.
  oauthIssuerUrl: process.env.OAUTH_ISSUER_URL ?? "",
  // JWKS override; defaults to `${OAUTH_ISSUER_URL}/.well-known/jwks.json`.
  oauthJwksUrl: process.env.OAUTH_JWKS_URL ?? "",
  // Canonical resource identifier for aud validation + RFC 9728 metadata.
  // Defaults to `${request origin}/mcp` when unset.
  oauthResourceUrl: process.env.OAUTH_RESOURCE_URL ?? "",
  // Expected `aud` claim; defaults to the resource URL.
  oauthAudience: process.env.OAUTH_AUDIENCE ?? "",
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "production",
} as const;

// NOTE: dark-paywall vars (CCC_PAYWALL_ARMED) and Stripe vars
// (CCC_STRIPE_WEBHOOK_SECRET, CCC_STRIPE_PRICE_*) are intentionally NOT frozen
// here — lib/paywall.ts and routes/stripe-webhook.ts read process.env at call
// time so the armed/dark state and webhook config always reflect the live
// environment (and so tests can exercise both states). See PAYWALL.md.
