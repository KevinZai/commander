import { Hono } from "hono";
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
    origin: ["https://cc-commander.com", "http://localhost:3000"],
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

app.get("/metrics", (c) => {
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
  | { ok: true; tool: string; args: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
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
    recordCall(tool, Date.now() - t0, false);
    return c.json({ result });
  } catch (err) {
    recordCall(tool, Date.now() - t0, true);
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

export { app };
export default {
  port: env.port,
  fetch: app.fetch,
};

// Validate request body shape — exported for tests
export { validateCallBody };
{ validateCallBody };
{ validateCallBody };
