#!/usr/bin/env node
// ============================================================================
// Kevin Z's CC Commander — OpenClaw Adapter (PostToolUse)
// ============================================================================
// Translates Bible hook events to OpenClaw webhook format and sends to the
// OpenClaw gateway at localhost:18789. Designed to never block Claude Code —
// all network failures are silently swallowed, always exits 0.
//
// Env vars:
//   KZ_OPENCLAW_ENABLED  — set to "1" to activate (default: disabled)
//   KZ_OPENCLAW_DEBUG    — set to "1" to log to stderr
//   KZ_OPENCLAW_URL      — gateway URL (default: http://localhost:18789)
//   KZ_OPENCLAW_TIMEOUT  — request timeout in ms (default: 2000)
// ============================================================================

'use strict';

const http = require('http');
const url = require('url');

const ENABLED = process.env.KZ_OPENCLAW_ENABLED === '1';
const DEBUG = process.env.KZ_OPENCLAW_DEBUG === '1';
const GATEWAY_URL = process.env.KZ_OPENCLAW_URL || 'http://localhost:18789';
const TIMEOUT_MS = parseInt(process.env.KZ_OPENCLAW_TIMEOUT, 10) || 2000;
const WEBHOOK_PATH = '/api/webhooks/bible';
const SOURCE = 'cc-commander';
const VERSION = '1.2';
const MAX_OUTPUT_BYTES = 10240; // 10KB truncation limit for tool output

function debug(msg) {
  if (DEBUG) {
    process.stderr.write(`[openclaw-adapter] ${msg}\n`);
  }
}

function truncate(value, maxBytes) {
  if (value === undefined || value === null) return null;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
  const truncated = Buffer.from(str, 'utf8').subarray(0, maxBytes).toString('utf8');
  return truncated + '\n...[truncated]';
}

function buildPayload(input) {
  const sessionId = process.env.CLAUDE_SESSION_ID
    || process.env.SESSION_ID
    || 'unknown';

  return {
    event: 'bible_hook',
    hookType: 'PostToolUse',
    hookName: 'openclaw-adapter',
    source: SOURCE,
    version: VERSION,
    timestamp: new Date().toISOString(),
    tool: {
      name: input.tool_name || null,
      input: input.tool_input || null,
      output: truncate(input.tool_output, MAX_OUTPUT_BYTES),
    },
    session: {
      id: sessionId,
      cwd: process.cwd(),
    },
    metadata: {},
  };
}

function sendToGateway(payload) {
  return new Promise((resolve) => {
    const parsed = url.parse(GATEWAY_URL + WEBHOOK_PATH);
    const body = JSON.stringify(payload);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Bible-Source': SOURCE,
        'X-Bible-Version': VERSION,
      },
      timeout: TIMEOUT_MS,
    };

    debug(`POST ${GATEWAY_URL}${WEBHOOK_PATH} (${Buffer.byteLength(body)} bytes)`);

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        debug(`Response: ${res.statusCode} ${responseData.slice(0, 200)}`);
        resolve();
      });
    });

    req.on('timeout', () => {
      debug(`Timeout after ${TIMEOUT_MS}ms — aborting`);
      req.destroy();
      resolve();
    });

    req.on('error', (err) => {
      debug(`Request error: ${err.message}`);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(data);

    // Always pass through — never block Claude
    console.log(data);

    // Skip if not enabled
    if (!ENABLED) {
      debug('Disabled (KZ_OPENCLAW_ENABLED != 1) — skipping');
      return;
    }

    // Build and send payload
    const payload = buildPayload(input);
    debug(`Sending event for tool: ${input.tool_name || 'unknown'}`);

    await sendToGateway(payload);
    debug('Event sent successfully');
  } catch (e) {
    // Silent fail — never block Claude Code
    debug(`Error: ${e.message}`);
    // Ensure passthrough even on parse errors
    if (data) {
      try { console.log(data); } catch { /* already written */ }
    }
  }
});
