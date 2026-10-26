/**
 * Focused tests for the monthly-cap enforcement in middleware/ratelimit.ts.
 *
 * Supabase and Upstash both speak HTTP via fetch, so global fetch is stubbed:
 * no network, no real services. Burst limiting is exercised only through its
 * fail-open path (Redis unreachable); the sliding-window script is Upstash's.
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
const { rateLimitMiddleware } = await import("../src/middleware/ratelimit.js");

type State = { callsUsed: number; cap: number; surveysThisMonth: number; capRpcFails: boolean; incrementCalls: number };
let state: State;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("upstash.io")) return json({ error: "down" }, 500); // burst limiter fails open
  if (url.includes("/rpc/get_effective_cap")) {
    return state.capRpcFails ? json({ message: "boom" }, 500) : json(state.cap);
  }
  if (url.includes("/rpc/increment_usage")) {
    state.incrementCalls++;
    return new Response(null, { status: 204 });
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

function mkApp() {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("auth", { userId: "00000000-0000-0000-0000-000000000001" });
    await next();
  });
  app.use("*", rateLimitMiddleware);
  app.post("/", (c) => c.json({ ok: true }));
  return app;
}

const call = () => mkApp().fetch(new Request("http://test/", { method: "POST" }));
const settle = () => new Promise((r) => setTimeout(r, 25)); // post-response side effects

afterEach(settle); // drain post-response side effects before the next test

beforeEach(() => {
  state = { callsUsed: 0, cap: 1000, surveysThisMonth: 1, capRpcFails: false, incrementCalls: 0 };
});

describe("monthly cap enforcement", () => {
  it("allows a call under the cap, reports quota headers, and records usage", async () => {
    state.callsUsed = 10;
    const res = await call();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("X-Commander-Calls-Used"), "11");
    assert.equal(res.headers.get("X-Commander-Calls-Cap"), "1000");
    await settle();
    assert.equal(state.incrementCalls, 1);
  });

  it("allows the last call (callsUsed = cap - 1)", async () => {
    state.callsUsed = 999;
    state.surveysThisMonth = 1;
    assert.equal((await call()).status, 200);
  });

  it("blocks with 429 once callsUsed reaches the cap, and does not count the rejected call", async () => {
    state.callsUsed = 1000;
    const res = await call();
    assert.equal(res.status, 429);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "Monthly call limit reached");
    assert.equal(body.callsUsed, 1000);
    assert.equal(body.cap, 1000);
    assert.equal(res.headers.get("X-Commander-Calls-Used"), "1000");
    await settle();
    assert.equal(state.incrementCalls, 0);
  });

  it("blocks when usage is already above the cap", async () => {
    state.callsUsed = 5000;
    assert.equal((await call()).status, 429);
  });

  it("honours a lowered cap (skip-streak penalty tier)", async () => {
    state.cap = 500;
    state.callsUsed = 500;
    const res = await call();
    assert.equal(res.status, 429);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /restore your cap to 1,000/);
  });

  it("offers upgrade copy instead of the survey restore at cap >= 1000", async () => {
    state.callsUsed = 1000;
    const body = (await (await call()).json()) as { message: string; upgradeUrl: string };
    assert.match(body.message, /Upgrade to Pro/);
    assert.match(body.upgradeUrl, /pricing/);
  });

  it("falls back to the 1000 cap when the cap RPC fails (fail-open, pinned)", async () => {
    state.capRpcFails = true;
    state.cap = 5; // ignored: the RPC failed
    state.callsUsed = 999;
    assert.equal((await call()).status, 200);
    state.callsUsed = 1000;
    assert.equal((await call()).status, 429);
  });

  it("fails open on burst limiter (Redis) outage but still enforces the monthly cap", async () => {
    state.callsUsed = 1;
    assert.equal((await call()).status, 200);
    state.callsUsed = 1000;
    assert.equal((await call()).status, 429);
  });
});

describe("feedback gate (every 20th call)", () => {
  it("returns 402 on call 20 when no survey was answered this month", async () => {
    state.callsUsed = 19;
    state.surveysThisMonth = 0;
    const res = await call();
    assert.equal(res.status, 402);
    assert.equal(((await res.json()) as { error: string }).error, "Survey required");
  });

  it("lets call 20 through when a survey was answered this month", async () => {
    state.callsUsed = 19;
    state.surveysThisMonth = 1;
    assert.equal((await call()).status, 200);
  });

  it("does not gate non-20th calls", async () => {
    state.callsUsed = 20;
    state.surveysThisMonth = 0;
    assert.equal((await call()).status, 200);
  });
});
