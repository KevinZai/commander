/**
 * Streamable-HTTP transport smoke tests for the /mcp endpoint.
 *
 * Run:  node --import tsx --test tests/mcp-transport.test.ts
 *
 * Two layers:
 *   1. Via the REAL app (src/index.ts): OAuth resource-server surface —
 *      RFC 9728 protected-resource metadata + 401 challenges with
 *      WWW-Authenticate. No DB calls (auth rejects before lookup).
 *   2. Via a standalone harness around createMcpTransportApp with a fake auth
 *      context + fake dispatchTool: the MCP handshake itself (initialize,
 *      tools/list of all 18 tools, tools/call, unknown-tool isError) without
 *      any network backends.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";

// ─── Fake env BEFORE importing the app ─────────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.OAUTH_ISSUER_URL = "https://issuer.example.com";

const { app } = await import("../src/index.js");
const { createMcpTransportApp } = await import("../src/mcp/transport.js");
const { TOOL_NAMES } = await import("../src/tools/index.js");
import type { AuthContext } from "../src/middleware/auth.js";

const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

function rpc(method: string, params?: unknown, id: number = 1): string {
  return JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) });
}

// ─── 1. OAuth resource-server surface (real app) ───────────────────────────
describe("RFC 9728 protected-resource metadata", () => {
  it("serves metadata at the bare well-known path", async () => {
    const res = await app.fetch(new Request("http://test/.well-known/oauth-protected-resource"));
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.resource, "http://test/mcp");
    assert.deepEqual(body.bearer_methods_supported, ["header"]);
    assert.deepEqual(body.authorization_servers, ["https://issuer.example.com"]);
    assert.equal(body.resource_name, "CC Commander MCP");
  });

  it("serves metadata at the path-suffixed variant (/mcp)", async () => {
    const res = await app.fetch(
      new Request("http://test/.well-known/oauth-protected-resource/mcp")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.resource, "http://test/mcp");
  });
});

describe("/mcp auth challenges", () => {
  it("401s an unauthenticated POST with a resource_metadata challenge", async () => {
    const res = await app.fetch(
      new Request("http://test/mcp", { method: "POST", headers: MCP_HEADERS, body: rpc("initialize") })
    );
    assert.equal(res.status, 401);
    const www = res.headers.get("WWW-Authenticate") ?? "";
    assert.match(www, /^Bearer /);
    assert.match(www, /resource_metadata="http:\/\/test\/\.well-known\/oauth-protected-resource"/);
  });

  it("401s a garbage bearer token (invalid_token) without hanging on JWKS", async () => {
    const res = await app.fetch(
      new Request("http://test/mcp", {
        method: "POST",
        headers: { ...MCP_HEADERS, Authorization: "Bearer not-a-real-token" },
        body: rpc("initialize"),
      })
    );
    assert.equal(res.status, 401);
    const www = res.headers.get("WWW-Authenticate") ?? "";
    assert.match(www, /error="invalid_token"/);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "Invalid or expired token");
  });

  it("401s a GET (SSE stream request) without auth too", async () => {
    const res = await app.fetch(
      new Request("http://test/mcp", { method: "GET", headers: { Accept: "text/event-stream" } })
    );
    assert.equal(res.status, 401);
  });

  it("keeps the /v1 Bearer path's error shape untouched (no WWW-Authenticate)", async () => {
    const res = await app.fetch(
      new Request("http://test/v1/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "commander_status" }),
      })
    );
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("WWW-Authenticate"), null);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "Missing or malformed Authorization header");
  });
});

// ─── 2. MCP handshake (standalone harness, fake auth + dispatch) ──────────
const FAKE_AUTH: AuthContext = {
  userId: "8a68e2f2-0000-4000-8000-00000000abcd",
  tier: "free",
  licenseKey: "test-license",
};

function makeHarness(dispatchResult: unknown = { ok: true }) {
  const dispatched: { tool: string; args: Record<string, unknown> }[] = [];
  const harness = new Hono();
  harness.use("*", async (c, next) => {
    c.set("auth", FAKE_AUTH);
    await next();
  });
  harness.route(
    "/",
    createMcpTransportApp({
      dispatchTool: async (tool, args) => {
        dispatched.push({ tool, args });
        if (dispatchResult instanceof Error) throw dispatchResult;
        return dispatchResult;
      },
    })
  );
  return { harness, dispatched };
}

function postMcp(harness: Hono, body: string) {
  return harness.fetch(new Request("http://test/", { method: "POST", headers: MCP_HEADERS, body }));
}

describe("streamable-HTTP handshake (stateless)", () => {
  it("answers initialize with serverInfo", async () => {
    const { harness } = makeHarness();
    const res = await postMcp(
      harness,
      rpc("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "1.0.0" },
      })
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    const body = (await res.json()) as {
      result: { serverInfo: { name: string }; protocolVersion: string };
    };
    assert.equal(body.result.serverInfo.name, "cc-commander");
    assert.ok(body.result.protocolVersion);
  });

  it("lists all 18 commander_* tools with schemas", async () => {
    const { harness } = makeHarness();
    const res = await postMcp(harness, rpc("tools/list", undefined, 2));
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      result: { tools: { name: string; inputSchema: object }[] };
    };
    assert.equal(body.result.tools.length, TOOL_NAMES.length);
    const names = body.result.tools.map((t) => t.name);
    assert.deepEqual(new Set(names), new Set(TOOL_NAMES));
    for (const tool of body.result.tools) {
      assert.ok(tool.inputSchema, `tool ${tool.name} missing inputSchema`);
    }
  });

  it("routes tools/call through the shared dispatchTool with auth context", async () => {
    const { harness, dispatched } = makeHarness({ version: "test", tier: "free" });
    const res = await postMcp(
      harness,
      rpc("tools/call", { name: "commander_status", arguments: {} }, 3)
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      result: { content: { type: string; text: string }[]; isError?: boolean };
    };
    assert.equal(body.result.isError ?? false, false);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].tool, "commander_status");
    const parsed = JSON.parse(body.result.content[0].text) as { version: string };
    assert.equal(parsed.version, "test");
  });

  it("returns isError (not a protocol error) for an unknown tool", async () => {
    const { harness, dispatched } = makeHarness();
    const res = await postMcp(
      harness,
      rpc("tools/call", { name: "commander_nonexistent", arguments: {} }, 4)
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      result: { content: { text: string }[]; isError?: boolean };
    };
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /Unknown tool/);
    assert.equal(dispatched.length, 0);
  });

  it("wraps dispatch failures as isError without leaking internals", async () => {
    const { harness } = makeHarness(new Error("secret internal detail"));
    const res = await postMcp(
      harness,
      rpc("tools/call", { name: "commander_status", arguments: {} }, 5)
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      result: { content: { text: string }[]; isError?: boolean };
    };
    assert.equal(body.result.isError, true);
    assert.doesNotMatch(body.result.content[0].text, /secret internal detail/);
  });
});
