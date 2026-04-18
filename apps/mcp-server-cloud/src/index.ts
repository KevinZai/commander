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
} from "./tools/index.js";
import type { AuthContext } from "./middleware/auth.js";

// ─── Boot sequence ─────────────────────────────────────────────────────────
const bootStart = Date.now();
await initRegistry();
logger.info({ ms: Date.now() - bootStart }, "Registry initialized");

const app = new Hono();

// ─── Global middleware ─────────────────────────────────────────────────────
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: ["https://cc-commander.com", "http://localhost:3000"],
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// ─── Health check (no auth) ────────────────────────────────────────────────
app.get("/health", (c) => {
  const reg = getRegistryState();
  return c.json({
    status: "ok",
    version: "4.0.0-beta.2",
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

function recordCall(tool: string, latencyMs: number, isError: boolean) {
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

function percentile(arr: number[], p: number): number {
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
    version: "4.0.0-beta.2",
    description: "456+ skills. 14 tools. Every AI IDE.",
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

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const capabilities = JSON.stringify({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {}, resources: {} },
    serverInfo: { name: "cc-commander", version: "4.0.0-beta.2" },
  });

  return c.body(`data: ${capabilities}\n\n`);
});

// ─── Tool call endpoint ────────────────────────────────────────────────────
mcp.post("/call", async (c) => {
  const auth = c.get("auth") as AuthContext;
  const body = await c.req.json<{ tool: string; args?: Record<string, unknown> }>();
  const { tool, args = {} } = body;

  if (!TOOL_NAMES.includes(tool as (typeof TOOL_NAMES)[number])) {
    return c.json({ error: `Unknown tool: ${tool}` }, 400);
  }

  logger.info({ userId: auth.userId, tool }, "Tool call");
  const t0 = Date.now();

  try {
    let result: unknown;

    switch (tool) {
      case "commander_list_skills":
        result = listSkills(args as Parameters<typeof listSkills>[0]);
        break;
      case "commander_get_skill":
        result = await getSkill(args as Parameters<typeof getSkill>[0]);
        break;
      case "commander_search":
        result = searchSkills(args as Parameters<typeof searchSkills>[0]);
        break;
      case "commander_suggest_for":
        result = suggestFor(args as Parameters<typeof suggestFor>[0]);
        break;
      case "commander_invoke_skill":
        result = await invokeSkill(args as Parameters<typeof invokeSkill>[0]);
        break;
      case "commander_list_agents":
        result = listAgents(args as Parameters<typeof listAgents>[0]);
        break;
      case "commander_get_agent":
        result = await getAgent(args as Parameters<typeof getAgent>[0]);
        break;
      case "commander_invoke_agent":
        result = await invokeAgent(args as Parameters<typeof invokeAgent>[0]);
        break;
      case "commander_status":
        result = await getStatus({}, auth);
        break;
      case "commander_update":
        result = checkUpdate({});
        break;
      case "commander_init":
        result = initProject(args as Parameters<typeof initProject>[0]);
        break;
      case "commander_notes_pin":
        result = await pinNote(args as Parameters<typeof pinNote>[0], auth);
        break;
      case "commander_tasks_push":
        result = pushTask(args as Parameters<typeof pushTask>[0]);
        break;
      case "commander_plan_integrate":
        result = integratePlan(args as Parameters<typeof integratePlan>[0]);
        break;
    }

    recordCall(tool, Date.now() - t0, false);
    return c.json({ result });
  } catch (err) {
    recordCall(tool, Date.now() - t0, true);
    logger.error({ err, tool, userId: auth.userId }, "Tool call error");
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.route("/v1", mcp);

// ─── Graceful shutdown ─────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  process.exit(0);
});

// ─── Start server ──────────────────────────────────────────────────────────
logger.info({ port: env.port }, "CC Commander MCP server starting");

export default {
  port: env.port,
  fetch: app.fetch,
};
