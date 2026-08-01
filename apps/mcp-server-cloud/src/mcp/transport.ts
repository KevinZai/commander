// MCP streamable-HTTP transport for /mcp.
//
// Serves the SAME 18 commander_* tools as the /v1 custom transport by reusing
// TOOL_NAMES / TOOL_SCHEMAS / dispatchTool — no tool logic is duplicated.
// Stateless mode (sessionIdGenerator: undefined): a fresh SDK Server +
// transport pair per request, which matches Fly's autoscaling model and
// requires no session affinity. /v1 (+ /v1/sse, /v1/call) is untouched.
//
// Auth is handled by mcpAuthMiddleware (mounted in index.ts) which sets the
// same AuthContext the /v1 path uses; rateLimitMiddleware runs there too, so
// burst limits and monthly caps apply identically across both transports.

import { Hono } from "hono";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_NAMES, TOOL_SCHEMAS, type ToolName } from "../tools/index.js";
import type { AuthContext } from "../middleware/auth.js";
import { SERVER_VERSION } from "../lib/version.js";
import { logger } from "../lib/logger.js";

export type McpTransportDeps = {
  dispatchTool: (
    tool: string,
    args: Record<string, unknown>,
    auth: AuthContext
  ) => Promise<unknown>;
  recordCall?: (tool: string, latencyMs: number, isError: boolean) => void;
  captureEvent?: (userId: string, event: string, props: Record<string, unknown>) => void;
};

function toolList(): { name: string; description?: string; inputSchema: object }[] {
  return TOOL_NAMES.map((name) => {
    const schema = TOOL_SCHEMAS[name] as { description?: string; inputSchema?: object };
    return {
      name,
      description: schema.description,
      inputSchema: schema.inputSchema ?? { type: "object" },
    };
  });
}

export function buildMcpServer(auth: AuthContext, deps: McpTransportDeps): Server {
  const server = new Server(
    { name: "cc-commander", version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolList() }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    if (!TOOL_NAMES.includes(tool as ToolName)) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${tool}` }],
        isError: true,
      };
    }

    // PRIVACY: mirror the /v1 handler — `args` are never logged or sent to
    // PostHog. Tool inputs are processed transiently and not retained.
    const t0 = Date.now();
    try {
      const result = await deps.dispatchTool(tool, args, auth);
      const latency = Date.now() - t0;
      deps.recordCall?.(tool, latency, false);
      deps.captureEvent?.(auth.userId, "mcp_tool_called", {
        tool,
        tier: auth.tier,
        latency_ms: latency,
        success: true,
        transport: "streamable-http",
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const latency = Date.now() - t0;
      deps.recordCall?.(tool, latency, true);
      deps.captureEvent?.(auth.userId, "mcp_tool_called", {
        tool,
        tier: auth.tier,
        latency_ms: latency,
        success: false,
        error_class: (err as Error).constructor?.name ?? "Error",
        transport: "streamable-http",
      });
      logger.error(
        { err: (err as Error).message, tool, userId: auth.userId },
        "MCP tool call error"
      );
      return {
        content: [{ type: "text" as const, text: "Internal server error executing tool" }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Hono sub-app handling the streamable-HTTP protocol at its mount point.
 * Callers mount auth + rate-limit middleware BEFORE this app.
 */
export function createMcpTransportApp(deps: McpTransportDeps): Hono {
  const app = new Hono();

  app.all("/", async (c) => {
    const auth = c.get("auth") as AuthContext;
    const server = buildMcpServer(auth, deps);
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: undefined, // stateless — no session affinity needed
      enableJsonResponse: true, // plain JSON for single-response POSTs
    });
    await server.connect(transport);
    const response = await transport.handleRequest(c);
    return response ?? c.json({ error: "Empty transport response" }, 500);
  });

  return app;
}
