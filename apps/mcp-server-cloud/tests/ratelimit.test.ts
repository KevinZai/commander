/**
 * Focused tests for middleware/ratelimit.ts: what is billed, atomic quota
 * reservation, fail-closed storage errors, and the opt-in survey gate.
 *
 * Supabase and Upstash both speak HTTP via fetch, so global fetch is stubbed:
 * no network, no real services. Burst limiting is exercised only through its
 * fail-open path (Redis unreachable); the sliding-window script is Upstash's.
 * The reserve_call double mirrors reserve_call in supabase/migrations/
 * 20261119000000_quota_reserve_and_stripe_claims.sql: it only increments while
 * calls_used < cap.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token"; // cp-secret-ok: test-only fixture
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";

const { Hono } = await import("hono");
const { rateLimitMiddleware, mcpRateLimitMiddleware, surveyGateConfig, upgradeUrl, DEFAULT_UPGRADE_URL } = await import(
  "../src/middleware/ratelimit.js"
);
const { readJsonBody, validateCallBody, MAX_CALL_BODY_BYTES } = await import("../src/lib/request-body.js");

type State = {
  callsUsed: number;
  cap: number;
  surveysThisMonth: number;
  capRpcFails: boolean;
  reserveFails: boolean;
  reserveCalls: number;
  reserveDelayMs: number;
};
let state: State;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("upstash.io")) return json({ error: "down" }, 500); // burst limiter fails open
  if (url.includes("/rpc/get_effective_cap")) {
    return state.capRpcFails ? json({ message: "boom" }, 500) : json(state.cap);
  }
  if (url.includes("/rpc/reserve_call")) {
    state.reserveCalls++;
    if (state.reserveFails) return json({ message: "function reserve_call does not exist" }, 404);
    const { p_cap } = JSON.parse(String(init?.body)) as { p_cap: number };
    if (state.reserveDelayMs) await new Promise((r) => setTimeout(r, state.reserveDelayMs));
    // Atomic in the double just as in SQL: check-and-increment in one step.
    if (state.callsUsed < p_cap) {
      state.callsUsed++;
      return json([{ allowed: true, calls_used: state.callsUsed }]);
    }
    return json([{ allowed: false, calls_used: state.callsUsed }]);
  }
  if (url.includes("/rest/v1/usage_counters")) return json({ calls_used: state.callsUsed });
  if (url.includes("/rest/v1/surveys")) {
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Range": `*/${state.surveysThisMonth}` },
    });
  }
  return new Response(null, { status: 204 }); // users.last_seen_at update
}) as typeof fetch;

function mkApp(middleware = rateLimitMiddleware) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("auth", { userId: "00000000-0000-0000-0000-000000000001", tier: "free" });
    await next();
  });
  app.use("*", middleware);
  // Handlers read the body the middleware already parsed (one read, one parse).
  app.post("/", async (c) => {
    const body = await readJsonBody(c);
    return c.json({ ok: true, echoed: body.ok ? body.value : null });
  });
  app.get("/", (c) => c.json({ ok: true }));
  return app;
}

const toolCall = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "commander_list_skills", arguments: {} } };
const post = (body: unknown) =>
  mkApp().fetch(
    new Request("http://test/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
const call = () => post(toolCall);
const settle = () => new Promise((r) => setTimeout(r, 25)); // post-response side effects

afterEach(settle);

beforeEach(() => {
  delete process.env.CCC_SURVEY_GATE;
  delete process.env.CCC_SURVEY_URL;
  delete process.env.CCC_UPGRADE_URL;
  state = { callsUsed: 0, cap: 1000, surveysThisMonth: 1, capRpcFails: false, reserveFails: false, reserveCalls: 0, reserveDelayMs: 0 };
});

describe("what counts as a billable call", () => {
  it("bills an MCP tools/call for a known tool, once, and hands the parsed body to the handler", async () => {
    state.callsUsed = 10;
    const res = await call();
    assert.equal(res.status, 200);
    assert.deepEqual(((await res.json()) as { echoed: unknown }).echoed, toolCall);
    assert.equal(res.headers.get("X-Commander-Calls-Used"), "11");
    assert.equal(res.headers.get("X-Commander-Calls-Cap"), "1000");
    assert.equal(state.reserveCalls, 1);
    assert.equal(state.callsUsed, 11);
  });

  it("bills the legacy /v1/call { tool } body", async () => {
    assert.equal((await post({ tool: "commander_list_skills", args: {} })).status, 200);
    assert.equal(state.reserveCalls, 1);
  });

  for (const [label, body] of [
    ["initialize", { jsonrpc: "2.0", id: 1, method: "initialize", params: {} }],
    ["tools/list", { jsonrpc: "2.0", id: 1, method: "tools/list" }],
    ["a notification", { jsonrpc: "2.0", method: "notifications/initialized" }],
    ["an unknown tool", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "nope" } }],
    ["malformed JSON", "{not json"],
  ] as const) {
    it(`does not bill ${label} or touch quota storage`, async () => {
      state.capRpcFails = true; // would 503 if storage were consulted
      const res = await post(body);
      assert.equal(res.status, 200);
      assert.equal(state.reserveCalls, 0);
      assert.equal(res.headers.get("X-Commander-Calls-Used"), null);
    });
  }

  it("does not bill a /v1 batch, which /v1/call rejects", async () => {
    state.capRpcFails = true;
    const res = await post([toolCall, toolCall]);
    assert.equal(res.status, 200);
    assert.equal(state.reserveCalls, 0);
    assert.deepEqual(validateCallBody([toolCall]), { ok: false, error: "Body must be a JSON object" });
  });

  it("never dispatches a mixed-format body through the legacy { tool } path", async () => {
    state.capRpcFails = true;
    const mixed = { jsonrpc: "2.0", id: 1, method: "initialize", tool: "commander_list_skills", args: {} };
    assert.equal((await post(mixed)).status, 200);
    assert.equal(state.reserveCalls, 0, "not billed");
    assert.equal(validateCallBody(mixed).ok, false, "and the /v1/call contract rejects it, so it is not run");
  });

  it("bills each tools/call in an /mcp batch, which the MCP transport dispatches", async () => {
    const res = await mkApp(mcpRateLimitMiddleware).fetch(
      new Request("http://test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([toolCall, { ...toolCall, id: 2 }, { jsonrpc: "2.0", method: "notifications/initialized" }]),
      })
    );
    assert.equal(res.status, 200);
    assert.equal(state.reserveCalls, 2);
  });

  it("does not bill the legacy { tool } body on /mcp, which the transport does not dispatch", async () => {
    state.capRpcFails = true;
    const res = await mkApp(mcpRateLimitMiddleware).fetch(
      new Request("http://test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: "commander_list_skills" }),
      })
    );
    assert.equal(res.status, 200);
    assert.equal(state.reserveCalls, 0);
  });

  it("reads the body stream once and refuses an oversized body without billing", async () => {
    state.capRpcFails = true;
    const big = JSON.stringify({ tool: "commander_list_skills", args: { pad: "x".repeat(MAX_CALL_BODY_BYTES) } });
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("auth", { userId: "00000000-0000-0000-0000-000000000001", tier: "free" });
      await next();
    });
    app.use("*", rateLimitMiddleware);
    app.post("/", async (c) => {
      const body = await readJsonBody(c);
      return body.ok ? c.json({ ok: true }) : c.json({ error: body.error }, body.status);
    });
    // No content-length: the limit is enforced while streaming.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const res = await app.fetch(
      new Request("http://test/", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit)
    );
    assert.equal(res.status, 413);
    assert.equal(state.reserveCalls, 0);
  });

  it("lets a user delete stored notes at the monthly cap, without billing", async () => {
    state.callsUsed = 1000; // at the cap
    const del = { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "commander_notes_pin", arguments: { action: "delete" } } };
    assert.equal((await post(del)).status, 200);
    assert.equal((await post({ tool: "commander_notes_pin", args: { action: "delete" } })).status, 200);
    assert.equal(state.reserveCalls, 0);
    const pin = { jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "commander_notes_pin", arguments: { note: "x" } } };
    assert.equal((await post(pin)).status, 429, "pinning is still billed");
  });

  it("does not bill a GET (SSE handshake)", async () => {
    const res = await mkApp().fetch(new Request("http://test/"));
    assert.equal(res.status, 200);
    assert.equal(state.reserveCalls, 0);
  });
});

describe("atomic monthly reservation", () => {
  it("allows the last call (callsUsed = cap - 1)", async () => {
    state.callsUsed = 999;
    assert.equal((await call()).status, 200);
    assert.equal(state.callsUsed, 1000);
  });

  it("blocks with 429 once callsUsed reaches the cap, without consuming quota", async () => {
    state.callsUsed = 1000;
    const res = await call();
    assert.equal(res.status, 429);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "Monthly call limit reached");
    assert.equal(body.callsUsed, 1000);
    assert.equal(body.cap, 1000);
    assert.equal(body.upgradeUrl, DEFAULT_UPGRADE_URL);
    assert.equal(body.surveyUrl, undefined, "no survey link unless the gate is configured");
    assert.equal(res.headers.get("X-Commander-Calls-Used"), "1000");
    assert.equal(state.callsUsed, 1000);
  });

  it("clamps the used header when usage is already above the cap", async () => {
    state.callsUsed = 5000;
    const res = await call();
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("X-Commander-Calls-Used"), "1000");
  });

  it("concurrent calls cannot overspend the last unit of quota", async () => {
    state.callsUsed = 998; // two units left
    state.reserveDelayMs = 5;
    const statuses = (await Promise.all(Array.from({ length: 6 }, () => call()))).map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 200).length, 2);
    assert.equal(statuses.filter((s) => s === 429).length, 4);
    assert.equal(state.callsUsed, 1000);
  });

  it("honours a lowered cap (skip-streak penalty tier)", async () => {
    state.cap = 500;
    state.callsUsed = 500;
    const res = await call();
    assert.equal(res.status, 429);
    assert.match(((await res.json()) as { message: string }).message, /resets at the start of next month/);
  });

  it("fails open on burst limiter (Redis) outage but still enforces the monthly cap", async () => {
    state.callsUsed = 1;
    assert.equal((await call()).status, 200);
    state.callsUsed = 1000;
    assert.equal((await call()).status, 429);
  });
});

describe("storage failure fails closed", () => {
  it("returns 503 quota_storage_unavailable when the cap RPC fails, and dispatches nothing", async () => {
    state.capRpcFails = true;
    const res = await call();
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("retry-after"), "30");
    assert.equal(((await res.json()) as { error: string }).error, "quota_storage_unavailable");
    assert.equal(state.reserveCalls, 0);
  });

  it("returns 503 when the reservation RPC fails (e.g. migration not applied)", async () => {
    state.reserveFails = true;
    const res = await call();
    assert.equal(res.status, 503);
    assert.equal(((await res.json()) as { error: string }).error, "quota_storage_unavailable");
  });
});

describe("survey gate (off by default)", () => {
  it("is disabled without CCC_SURVEY_GATE=1 and an https CCC_SURVEY_URL", () => {
    assert.equal(surveyGateConfig().enabled, false);
    process.env.CCC_SURVEY_GATE = "1";
    assert.equal(surveyGateConfig().enabled, false, "flag alone is not enough");
    process.env.CCC_SURVEY_URL = "http://insecure.example/survey";
    assert.equal(surveyGateConfig().enabled, false, "non-https URL is rejected");
    process.env.CCC_SURVEY_URL = "https://commanderplugin.com/survey";
    assert.deepEqual(surveyGateConfig(), { enabled: true, url: "https://commanderplugin.com/survey" });
  });

  it("never gates call 20 when not configured", async () => {
    state.callsUsed = 19;
    state.surveysThisMonth = 0;
    assert.equal((await call()).status, 200);
  });

  it("when configured, returns 402 on call 20 with the configured URL and consumes no quota", async () => {
    process.env.CCC_SURVEY_GATE = "1";
    process.env.CCC_SURVEY_URL = "https://commanderplugin.com/survey";
    state.callsUsed = 19;
    state.surveysThisMonth = 0;
    const res = await call();
    assert.equal(res.status, 402);
    const body = (await res.json()) as { error: string; surveyUrl: string };
    assert.equal(body.error, "Survey required");
    assert.equal(body.surveyUrl, "https://commanderplugin.com/survey");
    assert.equal(state.reserveCalls, 0);
  });

  it("when configured, lets call 20 through after a survey this month", async () => {
    process.env.CCC_SURVEY_GATE = "1";
    process.env.CCC_SURVEY_URL = "https://commanderplugin.com/survey";
    state.callsUsed = 19;
    state.surveysThisMonth = 1;
    assert.equal((await call()).status, 200);
  });
});

describe("configurable upgrade URL", () => {
  it("defaults to the main site and accepts only an https override", () => {
    assert.equal(upgradeUrl(), "https://commanderplugin.com");
    process.env.CCC_UPGRADE_URL = "javascript:alert(1)";
    assert.equal(upgradeUrl(), "https://commanderplugin.com");
    process.env.CCC_UPGRADE_URL = "https://commanderplugin.com/pro";
    assert.equal(upgradeUrl(), "https://commanderplugin.com/pro");
  });
});
