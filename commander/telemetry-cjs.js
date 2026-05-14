// CommonJS wrapper for the ESM telemetry client (lib/telemetry.mjs).
// Exposes a fire-and-forget track() function for use by the CLI.
//
// The plugin hooks import the .mjs version directly. CLI files (engine.js,
// dispatcher.js, plugins.js, skill-browser.js) are CommonJS and dynamically
// import the ESM module on first use.
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.commander');
const ANON_ID_FILE = path.join(CONFIG_DIR, 'anon-id');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const MCP_ENDPOINTS = [
  'https://mcp.commanderplugin.com/v1/events',
  'https://commander-mcp.fly.dev/v1/events',
];

let anonId = null;
let batchQueue = [];
let batchTimer = null;
const BATCH_SIZE = 10;
const BATCH_TIMEOUT_MS = 5000;

const VERSION = getVersion();
const OS = process.platform;
const NODE_VERSION = process.version;
const CCC_SURFACE = process.env.CCC_SURFACE || 'cli';

function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '4.1.0-beta.2';
    }
  } catch {
    // Ignore
  }
  return '4.1.0-beta.2';
}

function getOrCreateAnonId() {
  if (anonId) return anonId;
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(ANON_ID_FILE)) {
      const content = fs.readFileSync(ANON_ID_FILE, 'utf8').trim();
      if (content && content.length > 0) {
        anonId = content;
        return anonId;
      }
    }
    anonId = crypto.randomUUID();
    fs.writeFileSync(ANON_ID_FILE, anonId, { mode: 0o600 });
    return anonId;
  } catch {
    anonId = crypto.randomUUID();
    return anonId;
  }
}

function isTelemetryEnabled() {
  if (process.env.CCC_TELEMETRY === '0') return false;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (config.telemetry === false) return false;
    }
  } catch {
    // Ignore — default enabled
  }
  return true;
}

function scrubProperties(properties) {
  if (!properties || typeof properties !== 'object') return {};
  const SENSITIVE_PATTERN = /prompt|content|path|file|cwd|secret|password|key|token/i;
  const scrubbed = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!SENSITIVE_PATTERN.test(key)) {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

async function sendBatch(events) {
  if (events.length === 0) return;
  const payload = { events };
  for (const endpoint of MCP_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
    } catch {
      // Try next endpoint silently
    }
  }
  // All endpoints failed — silently fail
}

function flushBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  const current = batchQueue;
  batchQueue = [];
  if (current.length > 0) {
    sendBatch(current).catch(() => {
      // Silently fail
    });
  }
}

function scheduleBatchFlush() {
  if (batchTimer) return;
  batchTimer = setTimeout(flushBatch, BATCH_TIMEOUT_MS);
  if (batchTimer.unref) batchTimer.unref();
}

function track(eventName, properties = {}) {
  if (!isTelemetryEnabled()) return;
  if (typeof fetch !== 'function') return; // Node < 18

  const event = {
    name: eventName,
    distinct_id: getOrCreateAnonId(),
    properties: {
      ...scrubProperties(properties),
      version: VERSION,
      os: OS,
      node: NODE_VERSION,
      ccc_surface: CCC_SURFACE,
    },
    timestamp: new Date().toISOString(),
  };

  batchQueue.push(event);

  if (batchQueue.length >= BATCH_SIZE) {
    flushBatch();
  } else {
    scheduleBatchFlush();
  }
}

// Best-effort flush on process exit
process.on('SIGTERM', () => flushBatch());
process.on('SIGINT', () => flushBatch());
process.on('exit', () => flushBatch());

module.exports = { track, flushBatch, isTelemetryEnabled };
