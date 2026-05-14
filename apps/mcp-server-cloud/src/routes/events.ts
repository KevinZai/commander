// POST /v1/events — Anonymous telemetry ingestion endpoint
//
// Accepts batches of telemetry events from the local plugin + CLI surface.
// Each event is validated, sensitive properties are scrubbed, and the result
// is forwarded fire-and-forget to PostHog for aggregation.
//
// This endpoint is unauthenticated. Anonymity is guaranteed by:
//   - Client-side anon device ID (UUID, no PII)
//   - Strict event-name whitelist
//   - Property scrubbing for sensitive keys (defense in depth — client also scrubs)
//   - Per-distinct_id rate limit (100 batches/hour, in-memory TTL counter)

import { Hono } from "hono";
import { captureEvent } from "../lib/posthog.js";
import { logger } from "../lib/logger.js";

// ─── Configuration ─────────────────────────────────────────────────────────
const MAX_EVENTS_PER_BATCH = 50;
const MAX_PAYLOAD_BYTES = 50 * 1024; // 50KB
const RATE_LIMIT_BATCHES_PER_HOUR = 100;

// Whitelist of allowed event names. Anything else is rejected.
const ALLOWED_EVENTS = new Set([
  // Plugin hook events
  "hook_fired",
  "plugin_session_started",
  // CLI events
  "cli_command_executed",
  "cli_skill_invoked",
  "cli_agent_dispatched",
  "session_ended",
  // Generic skill/agent tracking
  "skill_invoked",
  "agent_dispatched",
]);

// Keys in this allowlist are NEVER scrubbed regardless of regex match.
// Add known-safe event-schema keys here when the regex would produce false positives.
const SCRUB_ALLOWLIST = new Set([
  "event_name",
  "os_name",
  "os_version",
  "node_version",
  "ccc_version",
  "surface_name",
  "hook",
  "handler",
  "agent_id",
  "skill_id",
  "repo_count",
  "org_count",
  "tier",
  "latency_ms",
  "success",
  "tool",
  "ccc_surface",
  "error_class",
  "error_code",
  "error_message_length",
]);

// Defensive regex to scrub sensitive keys — broader than strictly necessary, by design.
// The allowlist above carves out safe keys to prevent false positives.
const SENSITIVE_PATTERN =
  /prompt|content|path|file|cwd|secret|password|key|token|email|username|user[_-]?id|login|name|ip|org|repo|auth|credential|cookie|session[_-]?id|credit|card|ssn|phone|address/i;

const MAX_SCRUB_DEPTH = 5;
const MAX_VALUE_LENGTH = 1000;

// Recursively scrub sensitive keys from nested objects/arrays.
// Does NOT mutate the input — returns a new clone.
function scrubProperties(value: unknown, depth: number = 0): unknown {
  if (depth > MAX_SCRUB_DEPTH) {
    return "[depth-exceeded]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubProperties(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Allowlist wins — always keep known-safe keys
      if (SCRUB_ALLOWLIST.has(k)) {
        result[k] = scrubProperties(v, depth + 1);
        continue;
      }
      // Drop the key entirely if it matches the sensitive pattern
      if (SENSITIVE_PATTERN.test(k)) {
        continue;
      }
      result[k] = scrubProperties(v, depth + 1);
    }
    return result;
  }

  if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
    return value.slice(0, MAX_VALUE_LENGTH) + "[truncated]";
  }

  return value;
}

// ─── In-memory rate limit counter ───────────────────────────────────────────
// Keyed by distinct_id → array of timestamp milliseconds.
// Old entries (>1h) are pruned on every check, so memory stays bounded by
// the number of currently-active anon IDs in the last hour.
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(distinctId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const cutoff = now - windowMs;

  const timestamps = (rateLimitMap.get(distinctId) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= RATE_LIMIT_BATCHES_PER_HOUR) {
    rateLimitMap.set(distinctId, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  rateLimitMap.set(distinctId, timestamps);
  return { allowed: true, remaining: RATE_LIMIT_BATCHES_PER_HOUR - timestamps.length };
}

// Periodically prune empty entries so the map doesn't grow unbounded.
// Runs every 15 minutes; unrefs the timer so it doesn't block shutdown.
const pruneInterval = setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  },
  15 * 60 * 1000
);
if (typeof pruneInterval.unref === "function") {
  pruneInterval.unref();
}

// ─── Validation helpers ─────────────────────────────────────────────────────
type EventBody = {
  name: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp?: string;
};

type ValidationResult =
  | { ok: true; event: EventBody }
  | { ok: false; error: string };

function validateEvent(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid event object" };
  }
  const evt = raw as Record<string, unknown>;

  if (typeof evt.name !== "string" || !ALLOWED_EVENTS.has(evt.name)) {
    return { ok: false, error: `Invalid or disallowed event name: ${String(evt.name)}` };
  }

  if (typeof evt.distinct_id !== "string" || evt.distinct_id.length === 0) {
    return { ok: false, error: "Missing or invalid distinct_id" };
  }

  if (evt.distinct_id.length > 128) {
    return { ok: false, error: "distinct_id too long" };
  }

  let properties: Record<string, unknown> = {};
  if (evt.properties !== undefined) {
    if (
      typeof evt.properties !== "object" ||
      evt.properties === null ||
      Array.isArray(evt.properties)
    ) {
      return { ok: false, error: "Properties must be an object" };
    }
    properties = evt.properties as Record<string, unknown>;
  }

  // Recursively scrub sensitive keys (allowlist-aware, depth-bounded)
  const scrubbed = scrubProperties(properties) as Record<string, unknown>;

  const timestamp =
    typeof evt.timestamp === "string" ? evt.timestamp : new Date().toISOString();

  return {
    ok: true,
    event: {
      name: evt.name,
      distinct_id: evt.distinct_id,
      properties: scrubbed,
      timestamp,
    },
  };
}

// ─── Router ─────────────────────────────────────────────────────────────────
export const eventsRouter = new Hono();

eventsRouter.post("/", async (c) => {
  // Parse JSON body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Validate payload shape
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return c.json({ error: "Body must be a JSON object" }, 400);
  }

  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.events)) {
    return c.json({ error: "Missing 'events' array" }, 400);
  }

  const events = b.events as unknown[];
  if (events.length === 0) {
    return c.json({ error: "Events array cannot be empty" }, 400);
  }
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return c.json(
      { error: `Maximum ${MAX_EVENTS_PER_BATCH} events per batch` },
      400
    );
  }

  // Payload size cap
  const payloadSize = JSON.stringify(body).length;
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return c.json({ error: `Payload exceeds ${MAX_PAYLOAD_BYTES} byte limit` }, 413);
  }

  // Validate every event up front so we can do the rate-limit check
  // against a single representative distinct_id (the first valid one).
  const validated: EventBody[] = [];
  const results: Array<{ success: boolean; error?: string }> = [];

  for (const raw of events) {
    const result = validateEvent(raw);
    if (result.ok) {
      validated.push(result.event);
      results.push({ success: true });
    } else {
      results.push({ success: false, error: result.error });
    }
  }

  if (validated.length === 0) {
    return c.json(
      {
        ok: false,
        accepted: 0,
        rejected: events.length,
        results,
        error: "No valid events in batch",
      },
      400
    );
  }

  // Rate limit by the first valid event's distinct_id (anon device ID).
  const distinctId = validated[0].distinct_id;
  const rate = checkRateLimit(distinctId);
  if (!rate.allowed) {
    return c.json(
      {
        ok: false,
        accepted: 0,
        rejected: events.length,
        error: "Rate limit exceeded: max 100 batches/hour per device",
      },
      429
    );
  }

  // Forward to PostHog (fire-and-forget, never block response)
  let accepted = 0;
  for (const evt of validated) {
    try {
      captureEvent(evt.distinct_id, evt.name, {
        ...evt.properties,
        ccc_surface: evt.properties.ccc_surface ?? "plugin_cli",
      });
      accepted++;
    } catch (err) {
      // Replace the success entry with a failure for this event
      const idx = results.findIndex((r) => r.success === true);
      if (idx >= 0) {
        results[idx] = { success: false, error: (err as Error).message };
      }
      logger.warn(
        { err: (err as Error).message, event: evt.name },
        "Event forwarding to PostHog failed"
      );
    }
  }

  c.header("X-RateLimit-Remaining", String(rate.remaining));

  return c.json({
    ok: true,
    accepted,
    rejected: events.length - accepted,
    results,
  });
});

// Exported for tests
export { validateEvent, checkRateLimit, ALLOWED_EVENTS, scrubProperties, SCRUB_ALLOWLIST, SENSITIVE_PATTERN };
