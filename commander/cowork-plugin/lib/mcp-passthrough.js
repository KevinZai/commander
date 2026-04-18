'use strict';
/* global AbortController, fetch */
// CC Commander — MCP Passthrough Library
// Opt-in MCP calls with guaranteed local fallback.
// NEVER throws to caller. NEVER required for plugin to function.

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'commander', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'passthrough.jsonl');

const DEFAULT_TIMEOUT_MS = 2000;
const HEALTH_CACHE_TTL_MS = 30 * 1000;

let _healthCache = { ok: null, ts: 0 };

/**
 * Write a log entry to passthrough.jsonl (best-effort — never throws).
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
 * Perform a health-check ping against the MCP endpoint.
 * Result is cached for HEALTH_CACHE_TTL_MS (30s) to avoid repeated probes.
 * Returns true if MCP is reachable, false otherwise.
 */
async function healthCheck() {
  if (!isEnabled()) return false;

  const now = Date.now();
  if (_healthCache.ok !== null && now - _healthCache.ts < HEALTH_CACHE_TTL_MS) {
    return _healthCache.ok;
  }

  const cfg = readMcpConfig();
  if (!cfg) return false;

  const baseUrl = process.env.CCC_MCP_URL || cfg.url;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.headers) Object.assign(headers, cfg.headers);

    const res = await fetch(baseUrl.replace(/\/$/, '') + '/health', {
      method: 'GET',
      headers,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const ok = res.ok;
    _healthCache = { ok, ts: Date.now() };
    log({ event: 'health_check', ok, status: res.status });
    return ok;
  } catch (_e) {
    _healthCache = { ok: false, ts: Date.now() };
    log({ event: 'health_check', ok: false, error: _e.message });
    return false;
  }
}

/**
 * Call an MCP tool with automatic local fallback.
 *
 * Contract (non-negotiable):
 *   - MCP not configured  → immediately return fallback(args)
 *   - MCP disabled        → immediately return fallback(args)
 *   - Timeout / error     → return fallback(args)
 *   - 4xx / 5xx response  → return fallback(args)
 *   - NEVER throws        → always returns something
 *
 * @param {string} toolName  - MCP tool name (e.g. 'list_skills')
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

  const cfg = readMcpConfig();
  if (!cfg) {
    log({ event: 'call', tool: toolName, path: 'local', reason: 'no-config' });
    return fallback(args);
  }

  const baseUrl = process.env.CCC_MCP_URL || cfg.url;
  const url = baseUrl.replace(/\/$/, '') + '/tools/' + toolName;

  const headers = { 'Content-Type': 'application/json' };
  if (cfg.headers) Object.assign(headers, cfg.headers);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const mcpPromise = fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(args || {}),
      signal: ctrl.signal,
    });

    const res = await mcpPromise;
    clearTimeout(timer);

    if (!res.ok) {
      log({ event: 'call', tool: toolName, path: 'local', reason: 'http-' + res.status });
      return fallback(args);
    }

    const data = await res.json();
    log({ event: 'call', tool: toolName, path: 'mcp', status: res.status });
    return data;
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : 'error';
    log({ event: 'call', tool: toolName, path: 'local', reason, error: err.message });
    return fallback(args);
  }
}

/**
 * Invalidate the health cache (for testing).
 */
function resetHealthCache() {
  _healthCache = { ok: null, ts: 0 };
}

module.exports = { isEnabled, call, healthCheck, resetHealthCache };
