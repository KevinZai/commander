'use strict';
/* global AbortController, fetch */
// CC Commander — MCP Passthrough Library
// Opt-in MCP calls with guaranteed local fallback.
// NEVER throws to caller. NEVER required for plugin to function.
//
// Wire protocol: MCP Streamable HTTP (JSON-RPC 2.0 over POST) against the
// hosted server's /mcp endpoint (apps/mcp-server-cloud, e.g.
// https://mcp.commanderplugin.com/mcp):
//   initialize -> notifications/initialized   (once per process, cached)
//   tools/list                                (listTools)
//   tools/call                                (call)
// The server is stateless; it answers with plain JSON or, if it chooses to,
// a single-message SSE stream. Both are parsed. Every /mcp request counts
// against the caller's monthly cap, so the handshake is done once and reused.
//
// Health: the server serves an unauthenticated GET /health at its ORIGIN (not
// under /mcp). healthCheck() uses that when the server has it and otherwise
// falls back to the initialize handshake as the liveness signal.

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'commander', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'passthrough.jsonl');

const DEFAULT_TIMEOUT_MS = 2000;
const HEALTH_CACHE_TTL_MS = 30 * 1000;
const PROTOCOL_VERSION = '2025-06-18';
const CLIENT_INFO = { name: 'cc-commander-plugin', version: '1' };

// Short names the plugin uses -> the server's commander_* tool names.
const TOOL_ALIASES = {
  list_skills: 'commander_list_skills',
  get_skill: 'commander_get_skill',
  search: 'commander_search',
  search_skills: 'commander_search',
  suggest_for: 'commander_suggest_for',
  suggest_skill: 'commander_suggest_for',
  invoke_skill: 'commander_invoke_skill',
  list_agents: 'commander_list_agents',
  get_agent: 'commander_get_agent',
  invoke_agent: 'commander_invoke_agent',
  status: 'commander_status',
  get_status: 'commander_status',
};

let _healthCache = { ok: null, ts: 0 };
let _session = null; // { endpoint, authKey, protocolVersion, sessionId }
let _rpcId = 0;

/**
 * Write a log entry to passthrough.jsonl (best-effort — never throws).
 * Never pass headers or tokens in here.
 */
function log(entry) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
    fs.appendFileSync(LOG_FILE, line);
  } catch (_e) {
    // best-effort
  }
}

/**
 * Read the MCP config from .claude/mcp.json.
 * Supports both the project-local .claude/mcp.json and ~/.claude/mcp.json.
 * Returns null if cc-commander entry is not present.
 */
function readMcpConfig() {
  const candidates = [
    path.join(process.cwd(), '.claude', 'mcp.json'),
    path.join(os.homedir(), '.claude', 'mcp.json'),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      const entry = (parsed.mcpServers || parsed)['cc-commander'];
      if (entry && entry.url) return entry;
    } catch (_e) {
      // malformed config — skip
    }
  }
  return null;
}

/**
 * Returns true if MCP is configured and not explicitly disabled.
 * Checks env var MCP_DISABLED=1 first, then .claude/mcp.json.
 */
function isEnabled() {
  if (process.env.MCP_DISABLED === '1') return false;
  if (process.env.MCP_ENABLED === '0') return false;
  const cfg = readMcpConfig();
  return cfg !== null;
}

/**
 * The JSON-RPC endpoint for a configured URL. A bare origin gets `/mcp`; the
 * legacy `/sse` path (never served by the hosted server) maps to `/mcp`.
 */
function resolveEndpoint(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const p = u.pathname.replace(/\/+$/, '');
    if (p === '') u.pathname = '/mcp';
    else if (p.endsWith('/sse')) u.pathname = p.slice(0, -'/sse'.length) + '/mcp';
    else u.pathname = p;
    return u.toString();
  } catch (_e) {
    return null;
  }
}

/** Origin-level /health URL (the server mounts it at the root, not under /mcp). */
function resolveHealthUrl(endpoint) {
  try {
    return new URL('/health', endpoint).toString();
  } catch (_e) {
    return null;
  }
}

/** Expand `${VAR}` / `${env:VAR}` in a header value from process.env. */
function expandEnv(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{(?:env:)?([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name) => process.env[name] || '');
}

/**
 * Request headers for the configured server. Config headers are copied with
 * env expansion; a Bearer token in CCC_MCP_TOKEN or COMMANDER_TOKEN (if set)
 * wins over the config's Authorization. An Authorization that expands to an
 * empty token is dropped rather than sent as `Bearer `.
 */
function buildHeaders(cfg) {
  const headers = {};
  if (cfg && cfg.headers && typeof cfg.headers === 'object') {
    for (const [k, v] of Object.entries(cfg.headers)) headers[k] = expandEnv(v);
  }
  const token = process.env.CCC_MCP_TOKEN || process.env.COMMANDER_TOKEN;
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() !== 'authorization') continue;
    if (token || !/^Bearer\s+\S/.test(String(headers[k]))) delete headers[k];
  }
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

function resolveTarget() {
  const cfg = readMcpConfig();
  if (!cfg) return null;
  const endpoint = resolveEndpoint(process.env.CCC_MCP_URL || cfg.url);
  if (!endpoint) return null;
  return { endpoint, headers: buildHeaders(cfg) };
}

function mcpToolName(toolName) {
  if (typeof toolName !== 'string') return toolName;
  if (toolName.startsWith('commander_')) return toolName;
  return TOOL_ALIASES[toolName] || 'commander_' + toolName;
}

/** First JSON-RPC message in an SSE body whose id matches (or any, if id is null). */
function parseSse(text, id) {
  let data = [];
  const messages = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    else if (line === '' && data.length) {
      messages.push(data.join('\n'));
      data = [];
    }
  }
  if (data.length) messages.push(data.join('\n'));
  for (const m of messages) {
    try {
      const msg = JSON.parse(m);
      if (id == null || msg.id === id) return msg;
    } catch (_e) {
      // skip non-JSON events
    }
  }
  return null;
}

class RpcError extends Error {
  constructor(reason, message) {
    super(message || reason);
    this.reason = reason;
  }
}

/**
 * POST one JSON-RPC message to the endpoint. Notifications (no id) resolve to
 * null on any 2xx. Throws RpcError on HTTP, protocol, or timeout failures.
 */
async function rpc(target, method, params, timeoutMs, session) {
  const isNotification = method.startsWith('notifications/');
  const id = isNotification ? undefined : ++_rpcId;
  const headers = {
    ...target.headers,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (session && session.protocolVersion) headers['MCP-Protocol-Version'] = session.protocolVersion;
  if (session && session.sessionId) headers['Mcp-Session-Id'] = session.sessionId;

  const message = { jsonrpc: '2.0', method };
  if (id !== undefined) message.id = id;
  if (params !== undefined) message.params = params;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  let text;
  try {
    res = await fetch(target.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (err) {
    throw new RpcError(err && err.name === 'AbortError' ? 'timeout' : 'error', err && err.message);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new RpcError('http-' + res.status);
  if (isNotification) return { result: null, res };

  const type = (res.headers.get('content-type') || '').toLowerCase();
  let msg = null;
  try {
    msg = type.includes('text/event-stream') ? parseSse(text, id) : JSON.parse(text);
  } catch (_e) {
    msg = null;
  }
  if (!msg || typeof msg !== 'object') throw new RpcError('bad-response');
  if (msg.error) throw new RpcError('rpc-error', msg.error && msg.error.message);
  if (!('result' in msg)) throw new RpcError('bad-response');
  return { result: msg.result, res };
}

/**
 * initialize + notifications/initialized, cached per endpoint and credential
 * for the life of the process.
 */
async function ensureSession(target, timeoutMs) {
  const authKey = JSON.stringify(target.headers);
  if (_session && _session.endpoint === target.endpoint && _session.authKey === authKey) return _session;

  const { result, res } = await rpc(
    target,
    'initialize',
    { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
    timeoutMs,
    null
  );
  if (!result || typeof result.protocolVersion !== 'string') throw new RpcError('bad-initialize');
  const session = {
    endpoint: target.endpoint,
    authKey,
    protocolVersion: result.protocolVersion,
    sessionId: res.headers.get('mcp-session-id') || null,
    serverInfo: result.serverInfo || null,
  };
  await rpc(target, 'notifications/initialized', undefined, timeoutMs, session);
  _session = session;
  return session;
}

/** Decode a tools/call result into the tool's payload (what /v1 used to return). */
function decodeToolResult(result) {
  if (!result || typeof result !== 'object') throw new RpcError('bad-response');
  if (result.isError) throw new RpcError('tool-error');
  if (result.structuredContent && typeof result.structuredContent === 'object') return result.structuredContent;
  const texts = (Array.isArray(result.content) ? result.content : [])
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text);
  if (texts.length === 0) return result;
  const joined = texts.join('\n');
  try {
    return JSON.parse(joined);
  } catch (_e) {
    return { text: joined };
  }
}

/**
 * Health check. Uses the server's unauthenticated GET <origin>/health when it
 * exists; if that route is missing (404/405), the MCP initialize handshake is
 * the liveness signal. Cached for HEALTH_CACHE_TTL_MS (30s).
 * Returns true if MCP is reachable, false otherwise. Never throws.
 */
async function healthCheck() {
  if (!isEnabled()) return false;

  const now = Date.now();
  if (_healthCache.ok !== null && now - _healthCache.ts < HEALTH_CACHE_TTL_MS) {
    return _healthCache.ok;
  }

  const target = resolveTarget();
  if (!target) return false;

  let ok = false;
  let via = 'health';
  let status;
  const healthUrl = resolveHealthUrl(target.endpoint);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(healthUrl, { method: 'GET', signal: ctrl.signal });
      status = res.status;
      if (res.ok) ok = true;
      else if (res.status === 404 || res.status === 405) via = 'initialize';
    } finally {
      clearTimeout(timer);
    }
    if (via === 'initialize') {
      await ensureSession(target, DEFAULT_TIMEOUT_MS);
      ok = true;
    }
  } catch (err) {
    ok = false;
    log({ event: 'health_check', ok, via, error: err && (err.reason || err.message) });
    _healthCache = { ok, ts: Date.now() };
    return ok;
  }
  _healthCache = { ok, ts: Date.now() };
  log({ event: 'health_check', ok, via, status });
  return ok;
}

/**
 * Call an MCP tool with automatic local fallback.
 *
 * Contract (non-negotiable):
 *   - MCP not configured  → immediately return fallback(args)
 *   - MCP disabled        → immediately return fallback(args)
 *   - Timeout / error     → return fallback(args)
 *   - 4xx / 5xx response  → return fallback(args)
 *   - JSON-RPC error or tool isError → return fallback(args)
 *   - NEVER throws        → always returns something
 *
 * @param {string} toolName  - tool name; short names ('list_skills') map to commander_*
 * @param {object} args      - Arguments to pass to the tool
 * @param {object} opts
 * @param {function} opts.fallback  - async fn(args) → result (required)
 * @param {number}  [opts.timeout]  - override timeout in ms (default 2000)
 * @returns {Promise<*>}
 */
async function call(toolName, args, opts) {
  const fallback = opts && opts.fallback;
  const timeoutMs = (opts && opts.timeout) != null ? opts.timeout : DEFAULT_TIMEOUT_MS;

  if (!fallback) {
    throw new Error('mcp-passthrough: opts.fallback is required');
  }

  // Short-circuit: not enabled
  if (!isEnabled()) {
    log({ event: 'call', tool: toolName, path: 'local', reason: 'disabled' });
    return fallback(args);
  }

  const target = resolveTarget();
  if (!target) {
    log({ event: 'call', tool: toolName, path: 'local', reason: 'no-config' });
    return fallback(args);
  }

  const name = mcpToolName(toolName);
  try {
    const session = await ensureSession(target, timeoutMs);
    const { result } = await rpc(target, 'tools/call', { name, arguments: args || {} }, timeoutMs, session);
    const data = decodeToolResult(result);
    log({ event: 'call', tool: name, path: 'mcp' });
    return data;
  } catch (err) {
    const reason = (err && err.reason) || 'error';
    // A failed handshake or auth error must not stick to the next call.
    if (reason !== 'tool-error') _session = null;
    log({ event: 'call', tool: name, path: 'local', reason });
    return fallback(args);
  }
}

/**
 * tools/list against the configured server. Returns the tools array, or null
 * when MCP is off or unreachable. Never throws.
 */
async function listTools(opts) {
  const timeoutMs = (opts && opts.timeout) != null ? opts.timeout : DEFAULT_TIMEOUT_MS;
  if (!isEnabled()) return null;
  const target = resolveTarget();
  if (!target) return null;
  try {
    const session = await ensureSession(target, timeoutMs);
    const { result } = await rpc(target, 'tools/list', {}, timeoutMs, session);
    if (!result || !Array.isArray(result.tools)) throw new RpcError('bad-response');
    log({ event: 'list_tools', path: 'mcp', count: result.tools.length });
    return result.tools;
  } catch (err) {
    _session = null;
    log({ event: 'list_tools', path: 'local', reason: (err && err.reason) || 'error' });
    return null;
  }
}

/**
 * Invalidate the health cache and the cached MCP session (for testing).
 */
function resetHealthCache() {
  _healthCache = { ok: null, ts: 0 };
  _session = null;
}

module.exports = {
  isEnabled,
  call,
  listTools,
  healthCheck,
  resetHealthCache,
  // exported for tests
  _internal: { resolveEndpoint, resolveHealthUrl, buildHeaders, mcpToolName, parseSse },
};
