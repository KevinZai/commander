/**
 * Free-tier monthly quota enforcement tests (CC-789).
 *
 * Verifies the real auth + rate-limit middleware enforces the monthly cap
 * server-side, using in-memory doubles for Supabase and Upstash (no network,
 * no ports).
 *
 * Run:  node --import tsx --test tests/quota.test.ts
 */
import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.POSTHOG_API_KEY = "";
process.env.METRICS_AUTH_TOKEN = "";

const { app } = await import("../src/index.js");
const { db } = await import("../src/db/client.js");

const FREE_CAP = 1000;

function mockBackends(t: TestContext, opts: { callsUsed: number; cap: number; tier?: "free" | "pro" }) {
  const rpcCalls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    assert.match(String(input), /^https:\/\/test\.upstash\.io\//);
    const commands = JSON.parse(String(init?.body));
    const result = (command: unknown[]) => ({
      result: String(command[0]).toLowerCase().startsWith("eval") ? [59, 60] : 1,
    });
    return Response.json(Array.isArray(commands[0]) ? commands.map(result) : result(commands));
  });
  t.mock.method(db, "from", (table: string) => {
    const query = {
      select() { return query; },
      eq() { return query; },
      update() { return query; },
      async gte() { return { count: 1, error: null }; }, // survey answered: feedback gate open
      async maybeSingle() {
        return {
          error: null,
          data: table === "users"
            ? { user_id: "quota-user", tier: opts.tier ?? "free", license_key: "test-license" }
            : { calls_used: opts.callsUsed },
        };
      },
    };
    return query;
  });
  t.mock.method(db, "rpc", async (name: string) => {
    rpcCalls.push(name);
    return { data: name === "get_effective_cap" ? opts.cap : null, error: null };
  });
  return { rpcCalls };
}

function call(): Promise<Response> {
  return app.fetch(new Request("http://test/v1/call", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jwt.sign({ sub: "quota-user" }, process.env.JWT_SECRET!)}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }));
}

describe("free-tier monthly cap (server-side)", () => {
  it("allows the last call under the cap and counts it", async (t) => {
    // 998 used + this call = 999; 999 % 20 !== 0 so no feedback gate.
    const { rpcCalls } = mockBackends(t, { callsUsed: 998, cap: FREE_CAP });
    const res = await call();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-commander-calls-cap"), String(FREE_CAP));
    assert.equal(res.headers.get("x-commander-calls-used"), "999");
    assert.equal(rpcCalls.filter((n) => n === "increment_usage").length, 1);
  });

  it("rejects with 429 once the cap is reached and does not count the rejected call", async (t) => {
    const { rpcCalls } = mockBackends(t, { callsUsed: FREE_CAP, cap: FREE_CAP });
    const res = await call();
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("x-commander-calls-cap"), String(FREE_CAP));
    assert.equal(res.headers.get("x-commander-calls-used"), String(FREE_CAP));
    const body = await res.json();
    assert.equal(body.error, "Monthly call limit reached");
    assert.equal(body.callsUsed, FREE_CAP);
    assert.equal(body.cap, FREE_CAP);
    assert.match(body.upgradeUrl, /pricing/);
    assert.equal(rpcCalls.filter((n) => n === "increment_usage").length, 0);
  });

  it("stays rejected when usage is above the cap", async (t) => {
    mockBackends(t, { callsUsed: FREE_CAP + 50, cap: FREE_CAP });
    const res = await call();
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("x-commander-calls-used"), String(FREE_CAP));
  });

  it("enforces the reduced 500-call cap for a skip streak", async (t) => {
    mockBackends(t, { callsUsed: 500, cap: 500 });
    const res = await call();
    assert.equal(res.status, 429);
    assert.match((await res.json()).message, /1,000 calls\/month/);
  });

  it("enforces the 2,000-call survey-bonus cap", async (t) => {
    mockBackends(t, { callsUsed: 2000, cap: 2000 });
    const res = await call();
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("x-commander-calls-cap"), "2000");
  });

  it("honours a pro-sized cap", async (t) => {
    mockBackends(t, { callsUsed: 5000, cap: 100000, tier: "pro" });
    const res = await call();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-commander-calls-cap"), "100000");
  });
});
