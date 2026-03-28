// ============================================================================
// Kevin Z's Claude Code Kit — OpenClaw Adapter (PostToolUse)
// ============================================================================
// Bridges Bible hook events to OpenClaw webhook format. Fires on PostToolUse
// events, transforms the payload, and POSTs to OpenClaw gateway at
// localhost:18789. Gracefully falls back if OpenClaw is not running.
//
// Enable:  export KZ_OPENCLAW_ENABLED=1
// Disable: unset KZ_OPENCLAW_ENABLED (or set to 0/false)
//
// Gateway URL override: KZ_OPENCLAW_URL (default: http://localhost:18789)
// Timeout: KZ_OPENCLAW_TIMEOUT (default: 3000ms)
// ============================================================================

'use strict';

const http = require('http');
const url = require('url');

const ENABLED_VALUES = new Set(['1', 'true', 'yes']);

function isEnabled() {
  const val = (process.env.KZ_OPENCLAW_ENABLED || '').toLowerCase().trim();
  return ENABLED_VALUES.has(val);
}

function getGatewayUrl() {
  return process.env.KZ_OPENCLAW_URL || 'http://localhost:18789';
}

function getTimeout() {
  const val = parseInt(process.env.KZ_OPENCLAW_TIMEOUT, 10);
  return Number.isFinite(val) && val > 0 ? val : 3000;
}

function buildWebhookPayload(input) {
  const toolName = input.tool_name || 'unknown';
  const toolInput = input.tool_input || {};
  const toolOutput = input.tool_output || {};
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'unknown';

  return {
    source: 'claude-code-bible',
    event: 'post-tool-use',
    timestamp: new Date().toISOString(),
    sessionId,
    tool: {
      name: toolName,
      input: summarizePayload(toolInput),
      output: summarizePayload(toolOutput),
    },
    metadata: {
      hookVersion: '1.0.0',
      cwd: process.cwd(),
    },
  };
}

function summarizePayload(obj) {
  if (obj === null || obj === undefined) return null;
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  if (str.length <= 500) return obj;
  return {
    _truncated: true,
    _length: str.length,
    _preview: str.slice(0, 200),
  };
}

function postToGateway(payload) {
  return new Promise((resolve) => {
    const gatewayUrl = getGatewayUrl();
    const endpoint = `${gatewayUrl}/api/webhooks/bible`;
    const parsed = url.parse(endpoint);
    const body = JSON.stringify(payload);
    const timeout = getTimeout();

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Bible-Source': 'claude-code-kit',
        'X-Bible-Hook': 'openclaw-adapter',
      },
      timeout,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ sent: true, status: res.statusCode });
        } else {
          resolve({ sent: false, status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', () => {
      resolve({ sent: false, error: 'connection-failed' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ sent: false, error: 'timeout' });
    });

    req.write(body);
    req.end();
  });
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(data);

    if (!isEnabled()) {
      console.log(data);
      return;
    }

    const payload = buildWebhookPayload(input);

    postToGateway(payload).then((result) => {
      if (!result.sent && result.error !== 'connection-failed') {
        process.stderr.write(
          `[openclaw-adapter] webhook failed: ${result.error || `status ${result.status}`}\n`
        );
      }
    });

    console.log(data);
  } catch (e) {
    console.log(data);
  }
});
