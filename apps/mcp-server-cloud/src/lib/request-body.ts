// One read, one parse, one classification per request (Codex audit #20).
//
// The rate-limit middleware and the handlers used to read and classify the
// body independently, so billing and dispatch could disagree: a batch was
// charged and then rejected, and a mixed-format body could be billed as
// protocol traffic yet dispatched as a tool by the legacy handler. Now:
//   - readJsonBody reads the stream once, under a byte limit enforced while
//     reading, parses once, and caches the result on the request context;
//   - validateCallBody is the /v1/call contract, used by billing AND dispatch;
//   - billableCalls counts exactly what the transport will dispatch.

import type { Context } from "hono";
import { TOOL_NAMES } from "../tools/index.js";

/** Tool-call bodies are small; anything larger is refused before it is buffered. */
export const MAX_CALL_BODY_BYTES = 1024 * 1024;

export type JsonBody = { ok: true; value: unknown } | { ok: false; status: 400 | 413; error: string };

declare module "hono" {
  interface ContextVariableMap {
    jsonBody: JsonBody;
  }
}

// ─── Bounded body reader ────────────────────────────────────────────────────
// Enforces maxBytes on the raw byte stream BEFORE JSON.parse, so an oversized
// body is never fully buffered or parsed. A Content-Length above the limit is
// rejected without reading; otherwise reading stops (and the stream is
// cancelled) as soon as the running byte count passes the limit.
export type BodyRead = { ok: true; text: string } | { ok: false; status: 400 | 413; error: string };

export async function readBodyWithLimit(req: Request, maxBytes: number): Promise<BodyRead> {
  const tooLarge = { ok: false as const, status: 413 as const, error: `Payload exceeds ${maxBytes} byte limit` };
  const declared = req.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) return tooLarge;
  if (!req.body) return { ok: false, status: 400, error: "Invalid JSON body" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return tooLarge;
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
}

/** The request's JSON body, read and parsed once; later callers get the cached result. */
export async function readJsonBody(c: Context, maxBytes: number = MAX_CALL_BODY_BYTES): Promise<JsonBody> {
  const cached = c.get("jsonBody");
  if (cached) return cached;
  const raw = await readBodyWithLimit(c.req.raw, maxBytes);
  let result: JsonBody;
  if (!raw.ok) {
    result = raw;
  } else {
    try {
      result = { ok: true, value: JSON.parse(raw.text) };
    } catch {
      result = { ok: false, status: 400, error: "Invalid JSON body" };
    }
  }
  c.set("jsonBody", result);
  return result;
}

// ─── /v1/call request contract ──────────────────────────────────────────────
// Lightweight runtime check — we avoid adding zod as a runtime dep. Matches the
// known TOOL_SCHEMAS shape and rejects malformed input fast. Batches (arrays)
// are not supported on /v1/call.
export type CallRequest =
  | { ok: true; kind: "call"; tool: string; args: Record<string, unknown>; jsonrpcId?: unknown }
  | { ok: true; kind: "list"; jsonrpcId: string | number }
  | { ok: false; error: string };

export function validateCallBody(body: unknown): CallRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (b.jsonrpc === "2.0" || "method" in b) {
    // A JSON-RPC envelope is only ever read as JSON-RPC: a `tool` field beside
    // an unsupported method is never dispatched through the legacy form.
    if (b.jsonrpc !== "2.0" || typeof b.method !== "string") {
      return { ok: false, error: "Invalid JSON-RPC request" };
    }
    const params = b.params === undefined ? {} : b.params;
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      return { ok: false, error: "'params' must be an object" };
    }

    if (b.method === "tools/list") {
      if (typeof b.id !== "string" && !(typeof b.id === "number" && Number.isFinite(b.id))) {
        return { ok: false, error: "Missing or invalid JSON-RPC 'id' field" };
      }
      return { ok: true, kind: "list", jsonrpcId: b.id };
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
      return { ok: true, kind: "call", tool: p.name, args: rawArgs as Record<string, unknown>, jsonrpcId: b.id };
    }

    if (b.method.startsWith("commander_")) {
      return { ok: true, kind: "call", tool: b.method, args: params as Record<string, unknown>, jsonrpcId: b.id };
    }
    return { ok: false, error: `Unsupported JSON-RPC method: ${b.method.slice(0, 64)}` };
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
  return { ok: true, kind: "call", tool: b.tool, args };
}

// ─── What counts as a billable call ─────────────────────────────────────────
const KNOWN_TOOLS = new Set<string>(TOOL_NAMES);

/** Which dispatcher will handle the body: the /v1 REST handler or the /mcp streamable transport. */
export type Transport = "v1" | "mcp";

function mcpToolCalls(message: unknown): number {
  if (!message || typeof message !== "object" || Array.isArray(message)) return 0;
  const m = message as Record<string, unknown>;
  if (m.jsonrpc !== "2.0" || m.method !== "tools/call") return 0;
  const params = m.params as Record<string, unknown> | undefined;
  return typeof params?.name === "string" && KNOWN_TOOLS.has(params.name) ? 1 : 0;
}

/**
 * Billable tool calls in a parsed body, counted the way its transport
 * dispatches it. /v1: exactly the body validateCallBody accepts as a call for
 * a known tool (a batch is rejected there, so it is never charged). /mcp: each
 * JSON-RPC `tools/call` for a known tool, single or batched. Everything else
 * (protocol traffic, malformed or unknown-tool requests) is not billed.
 */
export function billableCalls(transport: Transport, body: unknown): number {
  if (transport === "v1") {
    const v = validateCallBody(body);
    return v.ok && v.kind === "call" && KNOWN_TOOLS.has(v.tool) ? 1 : 0;
  }
  if (Array.isArray(body)) return body.reduce((n: number, m) => n + mcpToolCalls(m), 0);
  return mcpToolCalls(body);
}
