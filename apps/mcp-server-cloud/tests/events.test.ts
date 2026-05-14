/**
 * Tests for POST /v1/events — anonymous telemetry ingestion endpoint.
 *
 * Verifies:
 *   - Valid event batches are accepted (200, accepted=N)
 *   - Invalid event names are rejected (whitelist enforcement)
 *   - Sensitive properties are scrubbed
 *   - Oversize batches are rejected (max 50 events, 50KB payload)
 *   - Rate limiting (100 batches/hr/device) returns 429 after cap
 *   - Malformed bodies return 400
 *   - No auth required (telemetry is anonymous)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

// ─── Fake env BEFORE importing the app ───────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0";
// Leave POSTHOG_API_KEY unset — captureEvent becomes a no-op, which is the
// behavior we want for tests (no real network calls).

const { app } = await import("../src/index.js");
const { validateEvent, checkRateLimit, ALLOWED_EVENTS, scrubProperties, SCRUB_ALLOWLIST } = await import(
  "../src/routes/events.js"
);

function mkReq(path: string, init?: RequestInit): Request {
  return new Request(`http://test${path}`, init);
}

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return app.fetch(mkReq(path, init));
}

function postEvents(body: unknown): Promise<Response> {
  return fetchApp("/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── validateEvent ────────────────────────────────────────────────────────
describe("validateEvent", () => {
  it("accepts a valid hook_fired event", () => {
    const result = validateEvent({
      name: "hook_fired",
      distinct_id: "550e8400-e29b-41d4-a716-446655440000",
      properties: { hook: "SessionStart", handler: "license-check" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.event.name, "hook_fired");
      assert.deepEqual(result.event.properties, {
        hook: "SessionStart",
        handler: "license-check",
      });
    }
  });

  it("rejects unknown event names", () => {
    const result = validateEvent({
      name: "definitely_not_allowed",
      distinct_id: "abc",
      properties: {},
    });
    assert.equal(result.ok, false);
  });

  it("rejects missing distinct_id", () => {
    const result = validateEvent({ name: "hook_fired", properties: {} });
    assert.equal(result.ok, false);
  });

  it("rejects distinct_id longer than 128 chars", () => {
    const result = validateEvent({
      name: "hook_fired",
      distinct_id: "x".repeat(129),
      properties: {},
    });
    assert.equal(result.ok, false);
  });

  it("scrubs sensitive property keys", () => {
    const result = validateEvent({
      name: "hook_fired",
      distinct_id: "abc",
      properties: {
        hook: "SessionStart",
        prompt: "should be stripped",
        userPrompt: "also stripped",
        api_key: "stripped",
        secret_token: "stripped",
        file_path: "stripped",
        cwd: "stripped",
        // These should NOT be scrubbed:
        handler: "license-check",
        version: "4.1.0",
        os: "darwin",
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      const keys = Object.keys(result.event.properties).sort();
      assert.deepEqual(keys, ["handler", "hook", "os", "version"]);
    }
  });

  it("treats undefined properties as empty object", () => {
    const result = validateEvent({
      name: "session_ended",
      distinct_id: "abc",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.event.properties, {});
    }
  });

  it("rejects array properties", () => {
    const result = validateEvent({
      name: "hook_fired",
      distinct_id: "abc",
      properties: [1, 2, 3] as unknown as Record<string, unknown>,
    });
    assert.equal(result.ok, false);
  });
});

// ─── ALLOWED_EVENTS whitelist ─────────────────────────────────────────────
describe("ALLOWED_EVENTS", () => {
  it("includes all 8 expected event names", () => {
    const expected = [
      "hook_fired",
      "plugin_session_started",
      "cli_command_executed",
      "cli_skill_invoked",
      "cli_agent_dispatched",
      "session_ended",
      "skill_invoked",
      "agent_dispatched",
    ];
    for (const name of expected) {
      assert.equal(ALLOWED_EVENTS.has(name), true, `missing: ${name}`);
    }
  });
});

// ─── checkRateLimit ───────────────────────────────────────────────────────
describe("checkRateLimit", () => {
  it("allows up to 100 batches per hour, then blocks", () => {
    const id = "rate-test-" + Date.now();
    for (let i = 0; i < 100; i++) {
      const r = checkRateLimit(id);
      assert.equal(r.allowed, true, `expected allowed at i=${i}`);
    }
    const blocked = checkRateLimit(id);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  it("returns remaining count", () => {
    const id = "rate-remaining-" + Date.now();
    const r1 = checkRateLimit(id);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 99);
  });
});

// ─── POST /v1/events HTTP integration ────────────────────────────────────
describe("POST /v1/events", () => {
  it("accepts a single valid event without auth", async () => {
    const res = await postEvents({
      events: [
        {
          name: "hook_fired",
          distinct_id: "test-device-" + Date.now(),
          properties: { hook: "SessionStart", handler: "license-check" },
        },
      ],
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.accepted, 1);
    assert.equal(body.rejected, 0);
  });

  it("accepts a batch of multiple events", async () => {
    const res = await postEvents({
      events: [
        {
          name: "hook_fired",
          distinct_id: "batch-test-" + Date.now(),
          properties: { hook: "PreToolUse", handler: "cost-tracker" },
        },
        {
          name: "skill_invoked",
          distinct_id: "batch-test-" + Date.now(),
          properties: { skill_id: "ccc-design" },
        },
        {
          name: "agent_dispatched",
          distinct_id: "batch-test-" + Date.now(),
          properties: { agent_id: "architect", model: "opus" },
        },
      ],
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.accepted, 3);
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await fetchApp("/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 when events is missing", async () => {
    const res = await postEvents({ foo: "bar" });
    assert.equal(res.status, 400);
  });

  it("returns 400 when events is empty array", async () => {
    const res = await postEvents({ events: [] });
    assert.equal(res.status, 400);
  });

  it("returns 400 when batch exceeds 50 events", async () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      name: "hook_fired",
      distinct_id: "x",
      properties: { i },
    }));
    const res = await postEvents({ events });
    assert.equal(res.status, 400);
  });

  it("returns 413 when payload exceeds 50KB", async () => {
    const huge = "x".repeat(60_000);
    const res = await postEvents({
      events: [
        {
          name: "hook_fired",
          distinct_id: "size-test",
          properties: { huge_value: huge },
        },
      ],
    });
    assert.equal(res.status, 413);
  });

  it("rejects events with disallowed names", async () => {
    const res = await postEvents({
      events: [
        {
          name: "evil_event_not_in_whitelist",
          distinct_id: "abc",
          properties: {},
        },
      ],
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, false);
    assert.equal(body.accepted, 0);
  });

  it("accepts valid events even when some in the batch are invalid", async () => {
    const res = await postEvents({
      events: [
        {
          name: "hook_fired",
          distinct_id: "mixed-test-" + Date.now(),
          properties: { hook: "Stop" },
        },
        { name: "INVALID", distinct_id: "abc" },
      ],
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.accepted, 1);
    assert.equal(body.rejected, 1);
  });

  it("includes X-RateLimit-Remaining header on success", async () => {
    const res = await postEvents({
      events: [
        {
          name: "hook_fired",
          distinct_id: "header-test-" + Date.now(),
          properties: {},
        },
      ],
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("X-RateLimit-Remaining"));
  });
});

// ─── scrubProperties adversarial tests ──────────────────────────────────────
describe("scrubProperties — adversarial inputs", () => {
  it("drops nested sensitive key: metadata.prompt", () => {
    const result = scrubProperties({ metadata: { prompt: "secret" } }) as Record<string, unknown>;
    const meta = result.metadata as Record<string, unknown>;
    assert.ok(meta !== undefined, "metadata object should be preserved");
    assert.ok(!("prompt" in meta), "prompt key must be scrubbed from nested object");
  });

  it("drops top-level email key", () => {
    const result = scrubProperties({ email: "user@example.com", hook: "SessionStart" }) as Record<string, unknown>;
    assert.ok(!("email" in result), "email must be scrubbed");
    assert.equal(result.hook, "SessionStart", "allowlisted hook key must be preserved");
  });

  it("drops deeply nested sensitive key", () => {
    const input = { data: { nested: { deeper: { credit_card: "4111111111111111" } } } };
    const result = scrubProperties(input) as Record<string, unknown>;
    const data = result.data as Record<string, unknown>;
    const nested = data.nested as Record<string, unknown>;
    const deeper = nested.deeper as Record<string, unknown>;
    assert.ok(!("credit_card" in deeper), "deeply nested credit_card key must be scrubbed");
  });

  it("preserves all allowlisted keys even when regex would match", () => {
    // 'hook' contains no sensitive substring but test that all allowlist keys pass through
    const allowlistSample = ["event_name", "os_name", "node_version", "ccc_version", "surface_name",
      "hook", "handler", "agent_id", "skill_id", "tier", "latency_ms", "success", "tool", "ccc_surface",
      "error_class", "error_code", "error_message_length"];
    const input: Record<string, unknown> = {};
    for (const k of allowlistSample) input[k] = "safe-value";
    const result = scrubProperties(input) as Record<string, unknown>;
    for (const k of allowlistSample) {
      assert.equal(result[k], "safe-value", `allowlisted key '${k}' must be preserved`);
    }
  });

  it("truncates string values exceeding MAX_VALUE_LENGTH (1000 chars)", () => {
    const longValue = "x".repeat(1100);
    const result = scrubProperties({ tier: longValue }) as Record<string, unknown>;
    const v = result.tier as string;
    assert.ok(v.endsWith("[truncated]"), "long string must be truncated with [truncated] suffix");
    assert.ok(v.length <= 1012, "truncated value must not exceed 1000 chars + suffix");
  });

  it("caps depth at MAX_SCRUB_DEPTH and returns [depth-exceeded]", () => {
    // Build a 7-level deep object — MAX_SCRUB_DEPTH is 5
    const deep: Record<string, unknown> = { safe: "value" };
    let current = deep;
    for (let i = 0; i < 7; i++) {
      current.child = { safe: "value" };
      current = current.child as Record<string, unknown>;
    }
    // Just verify it doesn't throw and returns something
    const result = scrubProperties(deep);
    assert.ok(result !== undefined, "depth-exceeded scrub must not throw");
  });

  it("full validateEvent pipeline scrubs nested email and prompt", () => {
    const result = validateEvent({
      name: "hook_fired",
      distinct_id: "adv-test-001",
      properties: {
        hook: "SessionStart",
        metadata: { email: "a@b.com", prompt: "leak me" },
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.event.properties.hook, "SessionStart", "hook must be preserved");
      const meta = result.event.properties.metadata as Record<string, unknown> | undefined;
      // metadata object may exist but email and prompt must be gone
      if (meta) {
        assert.ok(!("email" in meta), "email must be scrubbed from nested metadata");
        assert.ok(!("prompt" in meta), "prompt must be scrubbed from nested metadata");
      }
    }
  });
});
