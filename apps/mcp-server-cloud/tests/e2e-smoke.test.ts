import { after, before, describe, it } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

type SmokeTool = {
  name: string;
  args: Record<string, unknown>;
  requiresAuth?: boolean;
  externalEnv?: string[];
};

type SmokeFixture = {
  tools: SmokeTool[];
};

type ServerHandle = {
  child: ChildProcessWithoutNullStreams;
  baseUrl: string;
  stdout: string[];
  stderr: string[];
};

type JsonRpcResponse = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: unknown;
};

const PACKAGE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FIXTURE_PATH = path.join(PACKAGE_ROOT, "tests/fixtures/sample-inputs.json");
const EXPECTED_TOOL_COUNT = 18;

const fixture = parseFixture(JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as unknown);
const authToken = process.env.MCP_E2E_AUTH_TOKEN ?? process.env.COMMANDER_TOKEN ?? "";
let server: ServerHandle | null = null;
let serverSkipReason = "";

function parseFixture(value: unknown): SmokeFixture {
  assertRecord(value, "sample-inputs root");
  const tools = value.tools;
  assert.ok(Array.isArray(tools), "sample-inputs.json must contain a tools array");
  return {
    tools: tools.map((tool, index) => {
      assertRecord(tool, `tools[${index}]`);
      assert.equal(typeof tool.name, "string", `tools[${index}].name must be a string`);
      assertRecord(tool.args, `tools[${index}].args`);
      const externalEnv = tool.externalEnv;
      if (externalEnv !== undefined) {
        assert.ok(Array.isArray(externalEnv), `tools[${index}].externalEnv must be an array`);
        assert.ok(externalEnv.every((item) => typeof item === "string"), `tools[${index}].externalEnv must contain strings`);
      }
      return {
        name: tool.name,
        args: tool.args,
        requiresAuth: tool.requiresAuth === true,
        externalEnv: externalEnv as string[] | undefined,
      };
    }),
  };
}

function envValue(name: string): string {
  return process.env[`MCP_E2E_${name}`] ?? process.env[name] ?? "";
}

function missingBackendEnv(): string[] {
  return [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "JWT_SECRET",
  ].filter((name) => envValue(name).length === 0);
}

function fakeOrRealEnv(name: string, fallback: string): string {
  return envValue(name) || fallback;
}

function startServer(): Promise<ServerHandle> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stdoutLines: string[] = [];
  const child = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/local-server.ts"], {
    cwd: PACKAGE_ROOT,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "0",
      SUPABASE_URL: fakeOrRealEnv("SUPABASE_URL", "https://test.supabase.co"),
      SUPABASE_SERVICE_ROLE_KEY: fakeOrRealEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key"),
      UPSTASH_REDIS_REST_URL: fakeOrRealEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io"),
      UPSTASH_REDIS_REST_TOKEN: fakeOrRealEnv("UPSTASH_REDIS_REST_TOKEN", "test-redis-token"),
      JWT_SECRET: fakeOrRealEnv("JWT_SECRET", "test-jwt-secret-min-32-characters-long"),
    },
  });

  return new Promise<ServerHandle>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timed out waiting for local MCP server. stdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`));
    }, 15000);

    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk.toString("utf8")));
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout.push(text);
      stdoutLines.push(...text.split(/\r?\n/).filter(Boolean));
      for (const line of stdoutLines) {
        const parsed = parseJsonObject(line);
        if (parsed?.event === "listening" && typeof parsed.port === "number") {
          clearTimeout(timeout);
          resolve({
            child,
            baseUrl: `http://127.0.0.1:${parsed.port}`,
            stdout,
            stderr,
          });
          return;
        }
      }
    });
    child.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Local MCP server exited before listen (code=${code}, signal=${signal}). stdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`));
    });
  });
}

function parseJsonObject(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function waitForHealth(baseUrl: string): Promise<void> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < 10000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.status === 200) return;
      lastError = new Error(`HTTP ${res.status}: ${await res.text()}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError instanceof Error ? lastError : new Error("Timed out waiting for /health");
}

async function stopServer(handle: ServerHandle): Promise<void> {
  if (handle.child.exitCode !== null) return;
  handle.child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const hardKill = setTimeout(() => {
      if (handle.child.exitCode === null) handle.child.kill("SIGKILL");
      resolve();
    }, 6000);
    handle.child.once("exit", () => {
      clearTimeout(hardKill);
      resolve();
    });
  });
}

async function jsonPost(tool: SmokeTool): Promise<JsonRpcResponse> {
  assert.ok(server, "server must be started before calling tools");
  const res = await fetch(`${server.baseUrl}/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `e2e-${tool.name}`,
      method: "tools/call",
      params: {
        name: tool.name,
        arguments: tool.args,
      },
    }),
  });

  const body = await res.json() as unknown;
  assert.equal(res.status, 200, `${tool.name} expected HTTP 200, got ${res.status}: ${JSON.stringify(body)}`);
  assertRecord(body, `${tool.name} response`);
  return body;
}

function skipReason(tool: SmokeTool): string | undefined {
  if (tool.requiresAuth && !authToken) {
    return "missing MCP_E2E_AUTH_TOKEN or COMMANDER_TOKEN";
  }

  const backendMissing = tool.requiresAuth ? missingBackendEnv() : [];
  if (backendMissing.length > 0) {
    return `missing auth backend env: ${backendMissing.join(", ")}`;
  }

  const externalMissing = (tool.externalEnv ?? []).filter((name) => !process.env[name]);
  if (externalMissing.length > 0) {
    return `missing external service env: ${externalMissing.join(", ")}`;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(isRecord(value), `${label} must be an object`);
}

function assertArrayProp(value: Record<string, unknown>, prop: string): void {
  assert.ok(Array.isArray(value[prop]), `${prop} must be an array`);
}

function assertStringProp(value: Record<string, unknown>, prop: string): void {
  assert.equal(typeof value[prop], "string", `${prop} must be a string`);
}

function assertNumberProp(value: Record<string, unknown>, prop: string): void {
  assert.equal(typeof value[prop], "number", `${prop} must be a number`);
}

function assertBooleanProp(value: Record<string, unknown>, prop: string): void {
  assert.equal(typeof value[prop], "boolean", `${prop} must be a boolean`);
}

function requireServer(t: TestContext): ServerHandle | null {
  if (!server) {
    t.skip(serverSkipReason || "local HTTP listen unavailable");
    return null;
  }
  return server;
}

const resultValidators: Record<string, (result: unknown) => void> = {
  commander_list_skills: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "skills");
    assertNumberProp(result, "total");
    assertNumberProp(result, "page");
  },
  commander_get_skill: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "name");
    assertStringProp(result, "content");
    assertStringProp(result, "githubUrl");
  },
  commander_search: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "results");
    assertStringProp(result, "query");
    assertNumberProp(result, "total");
  },
  commander_suggest_for: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "suggestions");
    assertStringProp(result, "tip");
    assertArrayProp(result, "keywords");
  },
  commander_invoke_skill: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "skill");
    assertStringProp(result, "invocationGuide");
  },
  commander_list_agents: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "agents");
    assertNumberProp(result, "total");
  },
  commander_get_agent: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "name");
    assertStringProp(result, "content");
  },
  commander_invoke_agent: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "agent");
    assertStringProp(result, "invocationGuide");
  },
  commander_status: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "version");
    assertStringProp(result, "tier");
    assertRecord(result.usage, "usage");
  },
  commander_update: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "currentVersion");
    assertStringProp(result, "latestVersion");
    assertBooleanProp(result, "upToDate");
  },
  commander_init: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "files");
    assertStringProp(result, "installCommand");
    assertRecord(result.mcpConfig, "mcpConfig");
  },
  commander_notes_pin: (result) => {
    assertRecord(result, "result");
    assertBooleanProp(result, "pinned");
    assertStringProp(result, "message");
  },
  commander_tasks_push: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "status");
    assertStringProp(result, "title");
    assertStringProp(result, "message");
  },
  commander_plan_integrate: (result) => {
    assertRecord(result, "result");
    assertBooleanProp(result, "integrated");
    assertNumberProp(result, "taskCount");
    assertArrayProp(result, "tasks");
  },
  commander_install_skill: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "status");
    assertStringProp(result, "install_path");
    assertStringProp(result, "command");
  },
  commander_compatibility_check: (result) => {
    assertRecord(result, "result");
    assertBooleanProp(result, "compatible");
    assertArrayProp(result, "missing_capabilities");
    assertStringProp(result, "notes");
  },
  commander_session_diagnose: (result) => {
    assertRecord(result, "result");
    assertArrayProp(result, "findings");
    assertRecord(result.summary, "summary");
  },
  commander_compose_plan: (result) => {
    assertRecord(result, "result");
    assertStringProp(result, "plan_md");
    assertArrayProp(result, "recommended_skills");
    assertStringProp(result, "estimated_effort");
    assertArrayProp(result, "risks");
  },
};

before(async () => {
  assert.equal(fixture.tools.length, EXPECTED_TOOL_COUNT, "fixture must include one sample input per MCP tool");
  try {
    server = await startServer();
    await waitForHealth(server.baseUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "local MCP server failed to start";
    serverSkipReason = message.includes("listen EPERM")
      ? "local HTTP listen unavailable: listen EPERM on 127.0.0.1"
      : message;
  }
});

after(async () => {
  if (server) await stopServer(server);
});

describe("hosted MCP local E2E smoke", () => {
  it("returns health over HTTP", async (t) => {
    const handle = requireServer(t);
    if (!handle) return;
    const res = await fetch(`${handle.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as unknown;
    assertRecord(body, "health body");
    assert.equal(body.status, "ok");
  });

  it("discovers all smoke fixture tools", async (t) => {
    const handle = requireServer(t);
    if (!handle) return;
    const res = await fetch(`${handle.baseUrl}/v1`);
    assert.equal(res.status, 200);
    const body = await res.json() as unknown;
    assertRecord(body, "discovery body");
    assert.ok(Array.isArray(body.tools), "discovery tools must be an array");
    const discovered = new Set(
      body.tools.map((tool) => {
        assertRecord(tool, "discovery tool");
        assertStringProp(tool, "name");
        return tool.name as string;
      })
    );
    for (const tool of fixture.tools) {
      assert.ok(discovered.has(tool.name), `discovery missing ${tool.name}`);
    }
    assert.ok(discovered.size >= EXPECTED_TOOL_COUNT, `expected at least ${EXPECTED_TOOL_COUNT} tools`);
  });

  for (const tool of fixture.tools) {
    it(`POST /v1/call ${tool.name}`, { skip: skipReason(tool) }, async (t) => {
      const handle = requireServer(t);
      if (!handle) return;
      assert.ok(resultValidators[tool.name], `missing result validator for ${tool.name}`);
      const body = await jsonPost(tool);
      assert.equal(body.jsonrpc, "2.0");
      assert.equal(body.id, `e2e-${tool.name}`);
      assert.equal("error" in body, false, `${tool.name} returned JSON-RPC error: ${JSON.stringify(body.error)}`);
      assert.ok("result" in body, `${tool.name} response must contain result`);
      if (isRecord(body.result)) {
        assert.equal("error" in body.result, false, `${tool.name} result must not contain error`);
      }
      resultValidators[tool.name](body.result);
    });
  }
});
