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
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "production",
} as const;
