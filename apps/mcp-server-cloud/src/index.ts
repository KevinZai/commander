import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { initRegistry, getRegistryState } from "./lib/registry.js";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/ratelimit.js";
import {
  TOOL_NAMES,
  TOOL_SCHEMAS,
  listSkills,
  getSkill,
  searchSkills,
  suggestFor,
  invokeSkill,
  listAgents,
  getAgent,
  invokeAgent,
  getStatus,
  checkUpdate,
  initProject,
  pinNote,
  pushTask,
  integratePlan,
  installSkill,
  compatibilityCheck,
  sessionDiagnose,
  composePlan,
} from "./tools/index.js";
import type { AuthContext } from "./middleware/auth.js";
import { SERVER_VERSION } from "./lib/version.js";
import { getServerTagline } from "./lib/registry-stats.js";
import { captureEvent } from "./lib/posthog.js";

declare module "hono" {
  interface ContextVariableMap {
    reqId: string;
  }
}

// ─── Boot sequence ─────────────────────────────────────────────────────────
const bootStart = Date.now();
await initRegistry();
logger.info({ ms: Date.now() - bootStart }, "Registry initialized");

const app = new Hono();

// ─── Global middleware ─────────────────────────────────────────────────────
app.use("*", honoLogger());

// Request ID for traceability
app.use("*", async (c, next) => {
  const reqId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("reqId", reqId);
  c.header("X-Request-Id", reqId);
  await next();
});

app.use(
  "*",
  cors({
    origin: ["https://commanderplugin.com", "http://localhost:3000"],
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: [
      "X-Commander-Calls-Used",
      "X-Commander-Calls-Cap",
      "X-Commander-Burst-Remaining",
      "X-Request-Id",
    ],
  })
);

// ─── Health check (no auth) ────────────────────────────────────────────────
app.get("/health", (c) => {
  const reg = getRegistryState();
  return c.json({
    status: "ok",
    version: SERVER_VERSION,
    skills_loaded: reg.skillsLoaded,
    agents_loaded: reg.agentsLoaded,
    uptime_seconds: reg.uptimeSeconds,
    last_refreshed: reg.lastRefreshed,
  });
});

// ─── Prometheus metrics (no auth) ─────────────────────────────────────────
const callCounters: Record<string, number> = {};
const errorCounters: Record<string, number> = {};
const latencyBuckets: Record<string, number[]> = {};
let totalCalls = 0;
let totalErrors = 0;

export function recordCall(tool: string, latencyMs: number, isError: boolean): void {
  totalCalls++;
  callCounters[tool] = (callCounters[tool] ?? 0) + 1;
  if (isError) {
    totalErrors++;
    errorCounters[tool] = (errorCounters[tool] ?? 0) + 1;
  }
  if (!latencyBuckets[tool]) latencyBuckets[tool] = [];
  latencyBuckets[tool].push(latencyMs);
  // Keep last 1000 samples per tool
  if (latencyBuckets[tool].length > 1000) latencyBuckets[tool].shift();
}

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// CWE-306 auth hardening: bearer-token gate for /metrics endpoint
app.get("/metrics", (c) => {
  const token = env.metricsAuthToken;
  if (token) {
    const auth = c.req.header("Authorization") ?? "";
    if (auth !== `Bearer ${token}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  const reg = getRegistryState();
  const lines: string[] = [
    "# HELP commander_skills_loaded Number of skills in registry",
    "# TYPE commander_skills_loaded gauge",
    `commander_skills_loaded ${reg.skillsLoaded}`,
    "# HELP commander_agents_loaded Number of agents in registry",
    "# TYPE commander_agents_loaded gauge",
    `commander_agents_loaded ${reg.agentsLoaded}`,
    "# HELP commander_tool_calls_total Total tool calls",
    "# TYPE commander_tool_calls_total counter",
    `commander_tool_calls_total ${totalCalls}`,
    "# HELP commander_tool_errors_total Total tool errors",
    "# TYPE commander_tool_errors_total counter",
    `commander_tool_errors_total ${totalErrors}`,
  ];

  for (const tool of Object.keys(callCounters)) {
    lines.push(`commander_tool_calls_total{tool="${tool}"} ${callCounters[tool]}`);
    if (errorCounters[tool]) {
      lines.push(`commander_tool_errors_total{tool="${tool}"} ${errorCounters[tool]}`);
    }
    const latencies = latencyBuckets[tool] ?? [];
    if (latencies.length > 0) {
      lines.push(`commander_tool_latency_p50_ms{tool="${tool}"} ${percentile(latencies, 50)}`);
      lines.push(`commander_tool_latency_p95_ms{tool="${tool}"} ${percentile(latencies, 95)}`);
      lines.push(`commander_tool_latency_p99_ms{tool="${tool}"} ${percentile(latencies, 99)}`);
    }
  }

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
});

// ─── MCP discovery endpoint ────────────────────────────────────────────────
app.get("/v1", (c) => {
  return c.json({
    name: "CC Commander",
    version: SERVER_VERSION,
    description: getServerTagline(),
    tools: TOOL_NAMES.map((name) => ({
      name,
      ...(TOOL_SCHEMAS[name] as object),
    })),
  });
});

// ─── All tool calls require auth + rate limit ──────────────────────────────
const mcp = new Hono();
mcp.use("*", authMiddleware);
mcp.use("*", rateLimitMiddleware);

// ─── SSE transport for MCP-over-HTTP ──────────────────────────────────────
mcp.get("/sse", (c) => {
  const auth = c.get("auth") as AuthContext;
  logger.info({ userId: auth.userId }, "SSE connection established");

  const capabilities = JSON.stringify({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {}, resources: {} },
    serverInfo: { name: "cc-commander", version: SERVER_VERSION },
  });

  return new Response(`data: ${capabilities}\n\n`, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

// ─── Request body validation ──────────────────────────────────────────────
// Lightweight runtime check — we avoid adding zod as a runtime dep. Matches the
// known TOOL_SCHEMAS shape and rejects malformed input fast.
function validateCallBody(body: unknown):
  | { ok: true; tool: string; args: Record<string, unknown>; jsonrpcId?: unknown }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (b.jsonrpc === "2.0" && typeof b.method === "string") {
    const params = b.params === undefined ? {} : b.params;
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      return { ok: false, error: "'params' must be an object" };
    }

    if (b.method === "tools/call") {
      const p = params as Record<string, unknown>;
      if (typeof p.name !== "string" || p.name.length === 0) {
        return { ok: false, error: "Missing or invalid JSON-RPC 'params.name' field" };
      }
      const rawArgs = p.arguments ?? p.args ?? {};
      if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
        return { ok: false, error: "JSON-RPC 'params.arguments' must be an object" };
      }
      return { ok: true, tool: p.name, args: rawArgs as Record<string, unknown>, jsonrpcId: b.id };
    }

    if (b.method.startsWith("commander_")) {
      return { ok: true, tool: b.method, args: params as Record<string, unknown>, jsonrpcId: b.id };
    }
  }

  if (typeof b.tool !== "string" || b.tool.length === 0) {
    return { ok: false, error: "Missing or invalid 'tool' field" };
  }
  if (b.tool.length > 128) {
    return { ok: false, error: "'tool' field too long" };
  }
  let args: Record<string, unknown> = {};
  if (b.args !== undefined) {
    if (typeof b.args !== "object" || b.args === null || Array.isArray(b.args)) {
      return { ok: false, error: "'args' must be an object" };
    }
    args = b.args as Record<string, unknown>;
  }
  return { ok: true, tool: b.tool, args };
}

// ─── Tool call endpoint ────────────────────────────────────────────────────
mcp.post("/call", async (c) => {
  const auth = c.get("auth") as AuthContext;

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = validateCallBody(rawBody);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }
  const { tool, args } = parsed;

  if (!TOOL_NAMES.includes(tool as (typeof TOOL_NAMES)[number])) {
    return c.json({ error: `Unknown tool: ${tool}` }, 400);
  }

  const reqId = c.get("reqId");
  logger.info({ userId: auth.userId, tool, reqId }, "Tool call");
  const t0 = Date.now();

  try {
    const result = await dispatchTool(tool, args, auth);
    const latency = Date.now() - t0;
    recordCall(tool, latency, false);
    captureEvent(auth.userId, "mcp_tool_called", {
      tool,
      tier: auth.tier,
      latency_ms: latency,
      success: true,
    });
    if ("jsonrpcId" in parsed) {
      return c.json({ jsonrpc: "2.0", id: parsed.jsonrpcId ?? null, result });
    }
    return c.json({ result });
  } catch (err) {
    const latency = Date.now() - t0;
    recordCall(tool, latency, true);
    captureEvent(auth.userId, "mcp_tool_called", {
      tool,
      tier: auth.tier,
      latency_ms: latency,
      success: false,
      error_message: (err as Error).message,
    });
    logger.error(
      { err: (err as Error).message, tool, userId: auth.userId, reqId },
      "Tool call error"
    );
    return c.json({ error: "Internal server error", reqId }, 500);
  }
});

// Extracted for testability
export async function dispatchTool(
  tool: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<unknown> {
  switch (tool) {
    case "commander_list_skills":
      return listSkills(args as Parameters<typeof listSkills>[0]);
    case "commander_get_skill":
      return await getSkill(args as Parameters<typeof getSkill>[0]);
    case "commander_search":
      return searchSkills(args as Parameters<typeof searchSkills>[0]);
    case "commander_suggest_for":
      return suggestFor(args as Parameters<typeof suggestFor>[0]);
    case "commander_invoke_skill":
      return await invokeSkill(args as Parameters<typeof invokeSkill>[0]);
    case "commander_list_agents":
      return listAgents(args as Parameters<typeof listAgents>[0]);
    case "commander_get_agent":
      return await getAgent(args as Parameters<typeof getAgent>[0]);
    case "commander_invoke_agent":
      return await invokeAgent(args as Parameters<typeof invokeAgent>[0]);
    case "commander_status":
      return await getStatus({}, auth);
    case "commander_update":
      return checkUpdate({});
    case "commander_init":
      return initProject(args as Parameters<typeof initProject>[0]);
    case "commander_notes_pin":
      return await pinNote(args as Parameters<typeof pinNote>[0], auth);
    case "commander_tasks_push":
      return pushTask(args as Parameters<typeof pushTask>[0]);
    case "commander_plan_integrate":
      return integratePlan(args as Parameters<typeof integratePlan>[0]);
    case "commander_install_skill":
      return installSkill(args as Parameters<typeof installSkill>[0]);
    case "commander_compatibility_check":
      return await compatibilityCheck(args as Parameters<typeof compatibilityCheck>[0]);
    case "commander_session_diagnose":
      return sessionDiagnose(args as Parameters<typeof sessionDiagnose>[0]);
    case "commander_compose_plan":
      return composePlan(args as Parameters<typeof composePlan>[0]);
    default:
      throw new Error(`Unhandled tool: ${tool}`);
  }
}

// ─── Events ingestion endpoint (no auth required for plugin telemetry) ────────
// This endpoint accepts batches of telemetry events from the local plugin + CLI.
// Each event is forwarded to PostHog for aggregation.
app.post("/v1/events", async (c) => {
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
  if (events.length > 50) {
    return c.json({ error: "Maximum 50 events per batch" }, 400);
  }

  // Validate total payload size (50KB limit)
  const payloadSize = JSON.stringify(body).length;
  if (payloadSize > 50 * 1024) {
    return c.json({ error: "Payload exceeds 50KB limit" }, 413);
  }

  // Whitelist of allowed event names
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

  // Defensive regex to scrub sensitive keys
  const SENSITIVE_PATTERN = /prompt|content|path|file|cwd|secret|password|key|token/i;

  const results: Array<{ success: boolean; error?: string }> = [];
  let accepted = 0;

  for (const event of events) {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      results.push({ success: false, error: "Invalid event object" });
      continue;
    }

    const evt = event as Record<string, unknown>;

    // Validate required fields
    if (typeof evt.name !== "string" || !ALLOWED_EVENTS.has(evt.name)) {
      results.push({ success: false, error: `Invalid or disallowed event name: ${evt.name}` });
      continue;
    }

    if (typeof evt.distinct_id !== "string" || evt.distinct_id.length === 0) {
      results.push({ success: false, error: "Missing or invalid distinct_id" });
      continue;
    }

    // Properties must be an object
    let properties = evt.properties;
    if (properties === undefined) {
      properties = {};
    } else if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
      results.push({ success: false, error: "Properties must be an object" });
      continue;
    }

    // Scrub sensitive keys from properties
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!SENSITIVE_PATTERN.test(key)) {
        scrubbed[key] = value;
      }
    }

    // Forward to PostHog (fire-and-forget, never block response)
    try {
      captureEvent(evt.distinct_id, evt.name, {
        ...scrubbed,
        ccc_surface: "plugin_cli",
      });
      accepted++;
      results.push({ success: true });
    } catch (err) {
      results.push({ success: false, error: (err as Error).message });
    }
  }

  // Rate limit: 100 batches/hour per distinct_id (simple in-memory counter)
  // This is a soft limit — we still accept but log violations.
  const rateKey = `events_${b.distinct_id ?? "anonymous"}`;
  // TODO: Implement persistent rate limit tracking (Redis or TTL-based in-memory)

  return c.json({
    ok: true,
    accepted,
    rejected: events.length - accepted,
    results,
  });
});

app.route("/v1", mcp);

// ─── 404 handler ──────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Global error handler — ensures uncaught handler errors return JSON, not HTML
app.onError((err, c) => {
  const reqId = c.get("reqId");
  logger.error({ err: (err as Error).message, reqId }, "Unhandled error");
  return c.json({ error: "Internal server error", reqId }, 500);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────
let shuttingDown = false;

function registerShutdown(signal: NodeJS.Signals): void {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutdown signal received — draining (5s)");
    // 5s drain window for in-flight requests + Fly kill_timeout = 10s total
    setTimeout(() => {
      logger.info("Exit.");
      process.exit(0);
    }, 5000).unref();
  });
}
registerShutdown("SIGTERM");
registerShutdown("SIGINT");

process.on("uncaughtException", (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason: String(reason) }, "Unhandled rejection");
  process.exit(1);
});

// ─── Start server ──────────────────────────────────────────────────────────
logger.info({ port: env.port, version: SERVER_VERSION }, "CC Commander MCP server starting");

// Node entrypoint (Dockerfile runs `node dist/index.js`). @hono/node-server binds
// the port and keeps the event loop alive — without this the process exits clean.
serve({ fetch: app.fetch, port: env.port }, (info) => {
  logger.info({ port: info.port, version: SERVER_VERSION }, "CC Commander MCP server listening");
});

export { app };
// Bun-compatible default export — harmless under Node (serve() above does the work).
export default {
  port: env.port,
  fetch: app.fetch,
};

// Validate request body shape — exported for tests
export { validateCallBody };
