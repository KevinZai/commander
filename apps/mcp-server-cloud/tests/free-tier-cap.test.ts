/**
 * CC-350 regression tests: monthly free-tier cap, UTC month boundary, 429 shape.
 *
 * Fully offline: Supabase (`db`) and Upstash (`fetch`) are doubled in-process;
 * no live Redis or Supabase is contacted. The cap is injected through the
 * `get_effective_cap` RPC double (100 here, matching the CC-350 acceptance
 * criteria), so these tests do not depend on the server's default cap.
 *
 * Run:  node --import tsx --test tests/free-tier-cap.test.ts
 */

import { describe, it, afterEach, type TestContext } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.METRICS_AUTH_TOKEN = "";

const { app } = await import("../src/index.js");
const { db } = await import("../src/db/client.js");

const CAP = 100;
const originalTz = process.env.TZ;

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

type Calls = {
  monthFilters: string[];
  incrementMonths: string[];
  surveyGte: string[];
};

function mockBackends(t: TestContext, opts: { callsUsed: number; surveysThisMonth?: number }): Calls {
  const calls: Calls = { monthFilters: [], incrementMonths: [], surveyGte: [] };
  t.mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    const commands = JSON.parse(String(init?.body));
    const result = (command: unknown[]) => ({
      result: String(command[0]).toLowerCase().startsWith("eval") ? [59, 60] : 1,
    });
    return Response.json(Array.isArray(commands[0]) ? commands.map(result) : result(commands));
  });
  t.mock.method(db, "from", (table: string) => {
    const query = {
      select() { return query; },
      update() { return query; },
      eq(column: string, value: string) {
        if (table === "usage_counters" && column === "month") calls.monthFilters.push(value);
        return query;
      },
      async gte(_column: string, value: string) {
        calls.surveyGte.push(value);
        return { count: opts.surveysThisMonth ?? 0, error: null };
      },
      async maybeSingle() {
        return {
          error: null,
          data: table === "users"
            ? { user_id: "cap-user", tier: "free", license_key: "test-license" }
            : { calls_used: opts.callsUsed },
        };
      },
    };
    return query;
  });
  t.mock.method(db, "rpc", async (name: string, args?: { p_month?: string }) => {
    if (name === "increment_usage" && args?.p_month) calls.incrementMonths.push(args.p_month);
    return { data: name === "get_effective_cap" ? CAP : null, error: null };
  });
  return calls;
}

function callRequest(): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jwt.sign({ sub: "cap-user" }, process.env.JWT_SECRET!)}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  };
}

async function callAt(t: TestContext, iso: string): Promise<Response> {
  // Sign the token first: jsonwebtoken reads Date.now() for `iat`.
  const init = callRequest();
  t.mock.timers.enable({ apis: ["Date"], now: new Date(iso) });
  const response = await app.fetch(new Request("http://test/v1/call", init));
  // Let the post-response increment settle before the Date double is released.
  await new Promise((resolve) => setImmediate(resolve));
  return response;
}

describe("free-tier cap: UTC month boundary", () => {
  const cases: Array<[string, string, string]> = [
    ["last millisecond of January", "2026-01-31T23:59:59.999Z", "2026-01"],
    ["first millisecond of February", "2026-02-01T00:00:00.000Z", "2026-02"],
    ["last second of a leap February", "2028-02-29T23:59:59.000Z", "2028-02"],
    ["first instant of March after a leap February", "2028-03-01T00:00:00.000Z", "2028-03"],
    ["year rollover: last second of December", "2026-12-31T23:59:59.000Z", "2026-12"],
    ["year rollover: first instant of January", "2027-01-01T00:00:00.000Z", "2027-01"],
  ];

  for (const [name, iso, month] of cases) {
    it(`${name} reads and increments counter ${month}`, async (t) => {
      const calls = mockBackends(t, { callsUsed: 0 });
      const response = await callAt(t, iso);
      assert.equal(response.status, 200);
      assert.deepEqual(calls.monthFilters, [month]);
      assert.deepEqual(calls.incrementMonths, [month]);
    });
  }

  it("uses the UTC month even when the host timezone is already in the next month", async (t) => {
    // 2026-02-01T03:00Z is still Jan 31 in Los Angeles; the counter must be February's.
    process.env.TZ = "America/Los_Angeles";
    const calls = mockBackends(t, { callsUsed: 0 });
    await callAt(t, "2026-02-01T03:00:00.000Z");
    assert.deepEqual(calls.monthFilters, ["2026-02"]);
  });

  it("uses the UTC month even when the host timezone is still in the previous month", async (t) => {
    // 2026-01-31T20:00Z is already Feb 1 in Tokyo; the counter must be January's.
    process.env.TZ = "Asia/Tokyo";
    const calls = mockBackends(t, { callsUsed: 0 });
    await callAt(t, "2026-01-31T20:00:00.000Z");
    assert.deepEqual(calls.monthFilters, ["2026-01"]);
  });

  it("a user at the cap in one UTC month is served again the first millisecond of the next", async (t) => {
    // The counter is keyed by month, so a fresh month row (0 used) must reset the cap.
    mockBackends(t, { callsUsed: CAP });
    const blocked = await callAt(t, "2026-01-31T23:59:59.999Z");
    assert.equal(blocked.status, 429);
    t.mock.timers.reset();
    mockBackends(t, { callsUsed: 0 });
    const served = await callAt(t, "2026-02-01T00:00:00.000Z");
    assert.equal(served.status, 200);
  });
});

describe("free-tier cap: 429 regression", () => {
  it("serves the call just under the cap and reports usage headers", async (t) => {
    // callsUsed 98 -> this is call 99; 99 % 20 !== 0 so the feedback gate is not consulted.
    mockBackends(t, { callsUsed: CAP - 2 });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-commander-calls-used"), String(CAP - 1));
    assert.equal(response.headers.get("x-commander-calls-cap"), String(CAP));
  });

  it("serves exactly the 100th call when the monthly survey is answered", async (t) => {
    // callsUsed 99 -> call 100 (a feedback-gate call); a survey this month lets it through.
    mockBackends(t, { callsUsed: CAP - 1, surveysThisMonth: 1 });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-commander-calls-used"), String(CAP));
  });

  it("returns 429 on call 101 with the quota body and headers", async (t) => {
    mockBackends(t, { callsUsed: CAP });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("x-commander-calls-used"), String(CAP));
    assert.equal(response.headers.get("x-commander-calls-cap"), String(CAP));
    const body = await response.json();
    assert.equal(body.error, "Monthly call limit reached");
    assert.equal(body.callsUsed, CAP);
    assert.equal(body.cap, CAP);
    assert.equal(typeof body.message, "string");
  });

  it("keeps returning 429 well past the cap and never increments the counter", async (t) => {
    const calls = mockBackends(t, { callsUsed: CAP + 50 });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("x-commander-calls-used"), String(CAP), "header is clamped to the cap");
    assert.deepEqual(calls.incrementMonths, [], "a rejected call must not consume quota");
  });

  it("the 429 body carries no Retry-After (monthly cap is not a retry-soon condition)", async (t) => {
    mockBackends(t, { callsUsed: CAP });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), null);
  });

  it("the feedback gate fires on every 20th call (402, not 429) when no survey is answered", async (t) => {
    const calls = mockBackends(t, { callsUsed: 19, surveysThisMonth: 0 });
    const response = await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.equal(response.status, 402);
    assert.equal(calls.surveyGte.length, 1);
  });
});

describe("free-tier cap: survey lookback window", () => {
  it("the survey lookback starts at the first instant of the UTC month", async (t) => {
    process.env.TZ = "UTC"; // pin so the result does not depend on the CI host timezone
    const calls = mockBackends(t, { callsUsed: 19, surveysThisMonth: 1 });
    await callAt(t, "2026-03-10T12:00:00.000Z");
    assert.deepEqual(calls.surveyGte, ["2026-03-01T00:00:00.000Z"]);
  });

  // Regression (CC-350): checkFeedbackPending used local-time setDate/setHours, so on a
  // non-UTC host the window started in the wrong month.
  it("the survey lookback is the UTC month start on a non-UTC host", async (t) => {
    process.env.TZ = "Asia/Tokyo";
    const calls = mockBackends(t, { callsUsed: 19, surveysThisMonth: 1 });
    // 2026-02-28T20:00Z is already Mar 1 05:00 in Tokyo.
    await callAt(t, "2026-02-28T20:00:00.000Z");
    assert.deepEqual(calls.surveyGte, ["2026-02-01T00:00:00.000Z"]);
  });
});
