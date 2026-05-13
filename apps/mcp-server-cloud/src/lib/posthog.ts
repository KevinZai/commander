// Server-side PostHog capture for the hosted MCP. Lazy-initialized: if
// POSTHOG_API_KEY is unset (e.g. during local dev without the secret), every
// capture call becomes a silent no-op so analytics can't crash the request
// path. We never block a response on PostHog — capture is fire-and-forget.

import { PostHog } from "posthog-node";
import { env } from "./env.js";
import { logger } from "./logger.js";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  if (!env.posthogKey) return null;
  client = new PostHog(env.posthogKey, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 20,
    flushInterval: 10_000,
  });
  return client;
}

export function captureEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({
      distinctId: distinctId || "anonymous",
      event,
      properties: {
        $lib: "commander-mcp-server",
        $lib_version: "4.1.0-beta.2",
        ...properties,
      },
    });
  } catch (err) {
    // Never throw from analytics — log + move on.
    logger.warn({ err: (err as Error).message, event }, "posthog capture failed");
  }
}

export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "posthog shutdown failed");
  }
}
