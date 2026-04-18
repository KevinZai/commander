import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
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
  return c.json({ status: "ok", version: "4.0.0-beta.1", ts: Date.now() });
});

// ─── MCP discovery endpoint ────────────────────────────────────────────────
app.get("/v1", (c) => {
  return c.json({
    name: "CC Commander",
    version: "4.0.0-beta.1",
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

  // Return MCP server capabilities handshake
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const capabilities = JSON.stringify({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {}, resources: {} },
    serverInfo: { name: "cc-commander", version: "4.0.0-beta.1" },
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

  try {
    let result: unknown;

    switch (tool) {
      case "commander_list_skills":
        result = listSkills(args as Parameters<typeof listSkills>[0]);
        break;
      case "commander_get_skill":
        result = getSkill(args as Parameters<typeof getSkill>[0]);
        break;
      case "commander_search":
        result = searchSkills(args as Parameters<typeof searchSkills>[0]);
        break;
      case "commander_suggest_for":
        result = suggestFor(args as Parameters<typeof suggestFor>[0]);
        break;
      case "commander_invoke_skill":
        result = invokeSkill(args as Parameters<typeof invokeSkill>[0]);
        break;
      case "commander_list_agents":
        result = listAgents({});
        break;
      case "commander_get_agent":
        result = getAgent(args as Parameters<typeof getAgent>[0]);
        break;
      case "commander_invoke_agent":
        result = invokeAgent(args as Parameters<typeof invokeAgent>[0]);
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

    return c.json({ result });
  } catch (err) {
    logger.error({ err, tool, userId: auth.userId }, "Tool call error");
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.route("/v1", mcp);

// ─── Start server ──────────────────────────────────────────────────────────
logger.info({ port: env.port }, "CC Commander MCP server starting");

export default {
  port: env.port,
  fetch: app.fetch,
};
