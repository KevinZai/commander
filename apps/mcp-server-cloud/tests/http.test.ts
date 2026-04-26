/**
 * HTTP-layer tests for CC Commander MCP server.
 *
 * Covers:
 *   - GET /health (no auth)
 *   - GET /metrics (no auth, prometheus format)
 *   - GET /v1 (discovery)
 *   - POST /v1/call → 401 (missing auth)
 *   - POST /v1/call → 400 (malformed body)
 *   - POST /v1/call → 401 (bad JWT)
 *   - validateCallBody shape checks
 *   - CORS headers present
 *   - X-Request-Id header set
 *   - Graceful shutdown handlers registered
 *
 * Run:  node --import tsx --test tests/http.test.ts
 *
 * Env is faked via process.env before importing the app. The Supabase client
 * module is installed but no network calls are made by health/metrics/discovery
 * or 401/400 paths (auth middleware rejects before DB lookup).
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// ─── Fake env BEFORE importing the app ───────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0"; // no real port binding — fetch() drives app directly

// Dynamic import so env validation runs after we set the vars
const { app, validateCallBody, dispatchTool } = await import("../src/index.js");
const { SERVER_VERSION } = await import("../src/lib/version.js");

// ─── Helpers ─────────────────────────────────────────────────────────────
function mkReq(path: string, init?: RequestInit): Request {
  return new Request(`http://test${path}`, init);
}

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return app.fetch(mkReq(path, init));
}

// ─── validateCallBody ────────────────────────────────────────────────────
describe("validateCallBody", () => {
  it("rejects null", () => {
    const r = validateCallBody(null);
    assert.equal(r.ok, false);
  });

  it("rejects arrays", () => {
    const r = validateCallBody([]);
    assert.equal(r.ok, false);
  });

  it("rejects missing tool", () => {
    const r = validateCallBody({});
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /tool/);
  });

  it("rejects non-string tool", () => {
    const r = validateCallBody({ tool: 42 });
    assert.equal(r.ok, false);
  });

  it("rejects empty string tool", () => {
    const r = validateCallBody({ tool: "" });
    assert.equal(r.ok, false);
  });

  it("rejects over-long tool name", () => {
    const r = validateCallBody({ tool: "x".repeat(200) });
    assert.equal(r.ok, false);
  });

  it("rejects non-object args", () => {
    const r = validateCallBody({ tool: "foo", args: "bar" });
    assert.equal(r.ok, false);
  });

  it("rejects array args", () => {
    const r = validateCallBody({ tool: "foo", args: [] });
    assert.equal(r.ok, false);
  });

  it("accepts well-formed body", () => {
    const r = validateCallBody({ tool: "commander_status", args: { foo: 1 } });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.tool, "commander_status");
      assert.deepEqual(r.args, { foo: 1 });
    }
  });

  it("accepts body with missing args (defaults to {})", () => {
    const r = validateCallBody({ tool: "commander_status" });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.args, {});
  });
});

// ─── GET /health ─────────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with version", async () => {
    const res = await fetchApp("/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.version, SERVER_VERSION);
    assert.equal(typeof body.skills_loaded, "number");
    assert.equal(typeof body.uptime_seconds, "number");
  });

  it("has X-Request-Id header", async () => {
    const res = await fetchApp("/health");
    const reqId = res.headers.get("x-request-id");
    assert.ok(reqId, "X-Request-Id should be set");
    assert.ok(reqId!.length > 0);
  });

  it("echoes X-Request-Id when client sends one", async () => {
    const res = await fetchApp("/health", { headers: { "x-request-id": "client-abc-123" } });
    assert.equal(res.headers.get("x-request-id"), "client-abc-123");
  });
});

// ─── GET /metrics ────────────────────────────────────────────────────────
describe("GET /metrics", () => {
  it("returns prometheus text format", async () => {
    const res = await fetchApp("/metrics");
    assert.equal(res.status, 200);
    const ct = res.headers.get("content-type") ?? "";
    assert.match(ct, /text\/plain/);
    const body = await res.text();
    assert.match(body, /commander_skills_loaded/);
    assert.match(body, /commander_tool_calls_total/);
    assert.match(body, /# HELP/);
    assert.match(body, /# TYPE/);
  });
});

// ─── GET /v1 (discovery) ─────────────────────────────────────────────────
describe("GET /v1", () => {
  it("returns tool catalog with 18 tools", async () => {
    const res = await fetchApp("/v1");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, "CC Commander");
    assert.equal(body.version, SERVER_VERSION);
    assert.ok(Array.isArray(body.tools));
    assert.equal(body.tools.length, 18);
    assert.ok(body.tools.every((t: { name: string }) => t.name.startsWith("commander_")));
  });
});

// ─── POST /v1/call auth error paths ──────────────────────────────────────
describe("POST /v1/call auth errors", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Authorization/);
  });

  it("returns 401 when Authorization is not Bearer", async () => {
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic deadbeef",
      },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
  });

  it("returns 401 with empty bearer token", async () => {
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer ",
      },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
  });

  it("returns 401 when JWT is malformed", async () => {
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer not-a-real-jwt",
      },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Invalid|expired/i);
  });

  it("returns 401 when JWT is signed with wrong secret", async () => {
    const badToken = jwt.sign({ sub: "user-1" }, "different-secret-used-for-this-test");
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${badToken}`,
      },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
  });

  it("returns 401 when JWT has no subject claim", async () => {
    const tokenNoSub = jwt.sign({ foo: "bar" }, process.env.JWT_SECRET!);
    const res = await fetchApp("/v1/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenNoSub}`,
      },
      body: JSON.stringify({ tool: "commander_status" }),
    });
    assert.equal(res.status, 401);
  });
});

// ─── 404 path ────────────────────────────────────────────────────────────
describe("404 handler", () => {
  it("returns JSON 404 for unknown path", async () => {
    const res = await fetchApp("/nonexistent");
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, "Not found");
  });
});

// ─── CORS ────────────────────────────────────────────────────────────────
describe("CORS", () => {
  it("preflight OPTIONS returns allowed methods", async () => {
    const res = await fetchApp("/v1/call", {
      method: "OPTIONS",
      headers: {
        origin: "https://cc-commander.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    // Hono CORS returns 204 on preflight
    assert.ok(res.status === 204 || res.status === 200, `expected 200/204, got ${res.status}`);
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert.equal(allowOrigin, "https://cc-commander.com");
  });
});

// ─── dispatchTool unit ────────────────────────────────────────────────────
describe("dispatchTool", () => {
  it("throws on unhandled tool name", async () => {
    await assert.rejects(
      () =>
        dispatchTool("commander_never_existed", {}, {
          userId: "u1",
          tier: "free",
          licenseKey: "k",
        }),
      /Unhandled tool/
    );
  });

  it("dispatches commander_update synchronously", async () => {
    const result = await dispatchTool("commander_update", {}, {
      userId: "u1",
      tier: "free",
      licenseKey: "k",
    });
    const r = result as { upToDate: boolean; currentVersion: string };
    assert.equal(r.upToDate, true);
    assert.equal(r.currentVersion, SERVER_VERSION);
  });

  it("dispatches commander_init", async () => {
    const result = await dispatchTool("commander_init", { projectType: "api" }, {
      userId: "u1",
      tier: "free",
      licenseKey: "k",
    });
    const r = result as { projectType: string; files: unknown[] };
    assert.equal(r.projectType, "api");
    assert.ok(Array.isArray(r.files));
  });

  it("dispatches commander_plan_integrate", async () => {
    const result = await dispatchTool(
      "commander_plan_integrate",
      { plan: "- a\n- b" },
      { userId: "u1", tier: "free", licenseKey: "k" }
    );
    const r = result as { taskCount: number };
    assert.equal(r.taskCount, 2);
  });

  it("dispatches commander_tasks_push with not_configured", async () => {
    const result = await dispatchTool(
      "commander_tasks_push",
      { title: "new task" },
      { userId: "u1", tier: "free", licenseKey: "k" }
    );
    const r = result as { status: string; title: string };
    assert.equal(r.status, "not_configured");
    assert.equal(r.title, "new task");
  });
});

// ─── Shutdown handlers registered ────────────────────────────────────────
describe("graceful shutdown", () => {
  it("registers SIGTERM listener", () => {
    const count = process.listenerCount("SIGTERM");
    assert.ok(count >= 1, `expected SIGTERM listener, found ${count}`);
  });

  it("registers SIGINT listener", () => {
    const count = process.listenerCount("SIGINT");
    assert.ok(count >= 1, `expected SIGINT listener, found ${count}`);
  });

  it("registers uncaughtException listener", () => {
    const count = process.listenerCount("uncaughtException");
    assert.ok(count >= 1);
  });
});
