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

import { describe, it, before, type TestContext } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// ─── Fake env BEFORE importing the app ───────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.HOST = "127.0.0.1"; // startup regression test listens only on loopback
process.env.METRICS_AUTH_TOKEN = "";

// Dynamic import so env validation runs after we set the vars
const { app, validateCallBody, dispatchTool } = await import("../src/index.js");
const { SERVER_VERSION } = await import("../src/lib/version.js");
const { TOOL_NAMES, TOOL_SCHEMAS } = await import("../src/tools/index.js");
const { db } = await import("../src/db/client.js");

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
    if (r.ok && r.kind === "call") {
      assert.equal(r.tool, "commander_status");
      assert.deepEqual(r.args, { foo: 1 });
    }
  });

  it("accepts body with missing args (defaults to {})", () => {
    const r = validateCallBody({ tool: "commander_status" });
    assert.equal(r.ok, true);
    if (r.ok && r.kind === "call") assert.deepEqual(r.args, {});
  });

  it("accepts JSON-RPC tools/call bodies", () => {
    const r = validateCallBody({
      jsonrpc: "2.0",
      id: "rpc-1",
      method: "tools/call",
      params: {
        name: "commander_status",
        arguments: {},
      },
    });
    assert.equal(r.ok, true);
    if (r.ok && r.kind === "call") {
      assert.equal(r.tool, "commander_status");
      assert.deepEqual(r.args, {});
      assert.equal(r.jsonrpcId, "rpc-1");
    }
  });
});

// ─── GET /health ─────────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with version", async () => {
    const res = await fetchApp("/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    const packageVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
    assert.equal(body.version, packageVersion);
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
        origin: "https://commanderplugin.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    // Hono CORS returns 204 on preflight
    assert.ok(res.status === 204 || res.status === 200, `expected 200/204, got ${res.status}`);
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert.equal(allowOrigin, "https://commanderplugin.com");
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

// Expectations describe handler effects, excluding transport usage accounting.
const READ_ONLY_TOOLS = [
  "commander_list_skills", "commander_get_skill", "commander_search",
  "commander_suggest_for", "commander_invoke_skill", "commander_list_agents",
  "commander_get_agent", "commander_invoke_agent", "commander_status",
  "commander_update", "commander_init", "commander_tasks_push",
  "commander_plan_integrate", "commander_install_skill",
  "commander_compatibility_check", "commander_session_diagnose", "commander_compose_plan",
];
// Handler network calls include the managed Supabase backend (CC-655 r2).
const OPEN_WORLD_TOOLS = ["commander_status", "commander_update", "commander_notes_pin"];
const HINT_KEYS = ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"] as const;

function assertAnnotatedCatalog(tools: Array<Record<string, unknown>>) {
  assert.deepEqual(tools.map((tool) => tool.name), [...TOOL_NAMES]);
  for (const tool of tools) {
    assert.deepEqual(Object.keys(tool).sort(), ["annotations", "description", "inputSchema", "name"]);
    const annotations = tool.annotations as Record<string, unknown>;
    assert.ok(annotations, `${tool.name} must have nested annotations`);
    assert.deepEqual(Object.keys(annotations).sort(), [...HINT_KEYS, "title"].sort());
    assert.equal(typeof annotations.title, "string");
    assert.ok((annotations.title as string).trim().length > 0);
    for (const key of HINT_KEYS) assert.equal(typeof annotations[key], "boolean", `${tool.name}.${key}`);
    const name = tool.name as (typeof TOOL_NAMES)[number];
    assert.equal(tool.description, TOOL_SCHEMAS[name].description);
    assert.deepEqual(tool.inputSchema, TOOL_SCHEMAS[name].inputSchema);
    assert.equal(annotations.readOnlyHint, READ_ONLY_TOOLS.includes(name), name);
    assert.equal(annotations.destructiveHint, false, name);
    assert.equal(annotations.idempotentHint, name !== "commander_notes_pin", name);
    assert.equal(annotations.openWorldHint, OPEN_WORLD_TOOLS.includes(name), name);
  }
}

// Exercise real auth/rate-limit middleware against in-memory backend doubles.
function mockCatalogBackends(t: TestContext, callsUsed = 0, burstRemaining = 59) {
  const tables: string[] = [];
  const rpcCalls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    assert.match(String(input), /^https:\/\/test\.upstash\.io\//);
    const commands = JSON.parse(String(init?.body));
    const result = (command: unknown[]) => ({
      result: String(command[0]).toLowerCase().startsWith("eval") ? [burstRemaining, 60] : 1,
    });
    return Response.json(Array.isArray(commands[0]) ? commands.map(result) : result(commands));
  });
  t.mock.method(db, "from", (table: string) => {
    tables.push(table);
    const query = {
      select() { return query; },
      eq() { return query; },
      update() { return query; },
      async gte() { return { count: 0, error: null }; },
      async maybeSingle() {
        return {
          error: null,
          data: table === "users"
            ? { user_id: burstRemaining < 0 ? "burst-user" : "catalog-user", tier: "free", license_key: "test-license" }
            : { calls_used: callsUsed },
        };
      },
    };
    return query;
  });
  t.mock.method(db, "rpc", async (name: string) => {
    rpcCalls.push(name);
    return { data: name === "get_effective_cap" ? 1000 : null, error: null };
  });
  return { tables, rpcCalls };
}

function rpcRequest(body: unknown, authenticated = true): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? {
        authorization: `Bearer ${jwt.sign({ sub: "catalog-user" }, process.env.JWT_SECRET!)}`,
      } : {}),
    },
    body: JSON.stringify(body),
  };
}

describe("tool annotations and JSON-RPC discovery", () => {
  it("GET /v1 preserves fields and emits all spec-exact nested hints", async () => {
    const response = await fetchApp("/v1");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ["description", "name", "tools", "version"]);
    assertAnnotatedCatalog(body.tools);
  });

  it("tools/list returns the same catalog with string and numeric request IDs", async (t) => {
    const { tables } = mockCatalogBackends(t);
    const discovery = await (await fetchApp("/v1")).json();
    for (const id of ["catalog-1", 0]) {
      const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id, method: "tools/list" }));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-commander-calls-cap"), "1000");
      const body = await response.json();
      assert.deepEqual(body, { jsonrpc: "2.0", id, result: { tools: discovery.tools } });
      assertAnnotatedCatalog(body.result.tools);
    }
    assert.ok(tables.includes("users"), "auth must still query the user");
    assert.ok(tables.includes("usage_counters"), "rate limiting must still check usage");
  });

  it("tools/list still requires authentication", async () => {
    const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, false));
    assert.equal(response.status, 401);
  });

  it("tools/list still enforces the monthly quota", async (t) => {
    mockCatalogBackends(t, 1000);
    const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    assert.equal(response.status, 429);
  });

  it("tools/list still enforces burst protection", async (t) => {
    mockCatalogBackends(t, 0, -1);
    const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.match((await response.json()).error, /slow down/);
  });

  it("tools/list still enforces the feedback gate", async (t) => {
    const { tables } = mockCatalogBackends(t, 19);
    const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    assert.equal(response.status, 402);
    assert.equal((await response.json()).error, "Survey required");
    assert.ok(tables.includes("surveys"));
  });

  it("tools/list retains usage accounting", async (t) => {
    const { rpcCalls } = mockCatalogBackends(t);
    const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    assert.equal(response.status, 200);
    assert.equal(rpcCalls.filter((name) => name === "increment_usage").length, 1);
  });

  it("tools/list rejects invalid params and request IDs", async (t) => {
    mockCatalogBackends(t);
    for (const params of [null, [], "invalid"]) {
      const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list", params }));
      assert.equal(response.status, 400);
    }
    for (const id of [undefined, null, {}, false]) {
      const response = await fetchApp("/v1/call", rpcRequest({ jsonrpc: "2.0", id, method: "tools/list" }));
      assert.equal(response.status, 400);
    }
  });

  it("existing tools/call and custom call responses are unchanged", async (t) => {
    mockCatalogBackends(t);
    const args = { plan: "- first task\n- second task" };
    const expected = await dispatchTool("commander_plan_integrate", args, {
      userId: "catalog-user", tier: "free", licenseKey: "test-license",
    });
    const custom = await fetchApp("/v1/call", rpcRequest({ tool: "commander_plan_integrate", args }));
    assert.equal(custom.status, 200);
    assert.deepEqual(await custom.json(), { result: expected });
    const rpc = await fetchApp("/v1/call", rpcRequest({
      jsonrpc: "2.0", id: "call-1", method: "tools/call",
      params: { name: "commander_plan_integrate", arguments: args },
    }));
    assert.equal(rpc.status, 200);
    assert.deepEqual(await rpc.json(), { jsonrpc: "2.0", id: "call-1", result: expected });
  });
});

// Exercise the real Supabase client with only its network transport replaced.
describe("network-backed tool effects", () => {
  const auth = { userId: "effect-user", tier: "free" as const, licenseKey: "test-license" };

  it("status reads usage and cap over the network without updating them", async (t) => {
    const requests: string[] = [];
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://test.supabase.co");
      requests.push(`${init?.method} ${url.pathname}`);
      if (url.pathname === "/rest/v1/usage_counters") {
        assert.equal(init?.method, "GET");
        assert.equal(url.searchParams.get("user_id"), "eq.effect-user");
        return Response.json([{ calls_used: 7 }]);
      }
      assert.equal(url.pathname, "/rest/v1/rpc/get_effective_cap");
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), { p_user_id: auth.userId });
      return Response.json(1000);
    });

    const result = await dispatchTool("commander_status", {}, auth) as {
      usage: { callsUsed: number; cap: number; remaining: number };
    };
    assert.equal(result.usage.callsUsed, 7);
    assert.equal(result.usage.cap, 1000);
    assert.equal(result.usage.remaining, 993);
    assert.deepEqual(requests.sort(), ["GET /rest/v1/usage_counters", "POST /rest/v1/rpc/get_effective_cap"]);
  });

  it("notes_pin inserts a new remote note on each call without overwriting", async (t) => {
    const inserts: unknown[] = [];
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), "https://test.supabase.co/rest/v1/feedback");
      assert.equal(init?.method, "POST");
      assert.doesNotMatch(new Headers(init?.headers).get("Prefer") ?? "", /resolution=/);
      inserts.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 201 });
    });

    for (let call = 0; call < 2; call += 1) {
      const result = await dispatchTool("commander_notes_pin", { note: "Audit note" }, auth) as { pinned: boolean };
      assert.equal(result.pinned, true);
    }
    const expected = { user_id: auth.userId, category: "note", content: "Audit note", sentiment: "neutral" };
    assert.deepEqual(inserts, [expected, expected]);
  });
});


describe("server startup boundary", () => {
  const entrypoint = fileURLToPath(new URL("../src/index.ts", import.meta.url));

  it("importing the app exits without a listening socket or forced exit", () => {
    const result = spawnSync(process.execPath, [
      "--import", "tsx", "--input-type=module", "--eval",
      `await import(${JSON.stringify(new URL("../src/index.ts", import.meta.url).href)})`,
    ], {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8", timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /server listening/);
  });

  it("the direct entrypoint serves health over loopback", { timeout: 15000 }, async () => {
    const child = spawn(process.execPath, ["--import", "tsx", entrypoint], {
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = once(child, "exit");
    let output = "";
    try {
      const port = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Server did not start")), 10000);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("exit", () => { clearTimeout(timer); reject(new Error("Server exited before listening")); });
        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
          for (const line of output.split("\n")) {
            try {
              const log = JSON.parse(line);
              if (log.msg === "CC Commander MCP server listening") {
                clearTimeout(timer);
                resolve(log.port);
              }
            } catch { /* wait for a complete JSON log line */ }
          }
        });
      });
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).version, SERVER_VERSION);
    } finally {
      child.kill("SIGKILL");
      await exited;
    }
  });
});
