#!/usr/bin/env node
// Telemetry client for CC Commander plugin + CLI.
// Handles event batching, opt-out checks, and fire-and-forget delivery to MCP /v1/events.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG_DIR = path.join(os.homedir(), '.commander');
const ANON_ID_FILE = path.join(CONFIG_DIR, 'anon-id');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const MCP_ENDPOINTS = [
  'https://mcp.commanderplugin.com/v1/events',
  'https://commander-mcp.fly.dev/v1/events',
];

// ─── Globals ──────────────────────────────────────────────────────────────────
let anonId = null;
let batchQueue = [];
let batchTimer = null;
const BATCH_SIZE = 10;
const BATCH_TIMEOUT_MS = 5000;

const VERSION = getVersion();
const OS = process.platform;
const NODE_VERSION = process.version;
const CCC_SURFACE = process.env.CCC_SURFACE || 'unknown';

// ─── Helper: Read or create anon device ID ────────────────────────────────────
function getOrCreateAnonId() {
  if (anonId) return anonId;

  try {
    // Create config dir if not exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    // Try to read existing anon-id
    if (fs.existsSync(ANON_ID_FILE)) {
      const content = fs.readFileSync(ANON_ID_FILE, 'utf8').trim();
      if (content && content.length > 0) {
        anonId = content;
        return anonId;
      }
    }

    // Generate new UUID v4 and persist
    anonId = randomUUID();
    fs.writeFileSync(ANON_ID_FILE, anonId, { mode: 0o600 });
    return anonId;
  } catch (err) {
    // Fallback: use a temporary UUID for this session
    anonId = randomUUID();
    return anonId;
  }
}

// ─── Helper: Check opt-out ────────────────────────────────────────────────────
function isTelemetryEnabled() {
  // Check env var first (highest priority)
  if (process.env.CCC_TELEMETRY === '0') {
    return false;
  }

  // Check config file
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (config.telemetry === false) {
        return false;
      }
    }
  } catch {
    // Ignore parse errors — assume enabled
  }

  return true;
}

// ─── Helper: Get package version ──────────────────────────────────────────────
function getVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.version || '4.1.0-beta.2';
    }
  } catch {
    // Ignore
  }
  return '4.1.0-beta.2';
}

// ─── Helper: Scrub sensitive properties ───────────────────────────────────────
function scrubProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return {};
  }

  const SENSITIVE_PATTERN = /prompt|content|path|file|cwd|secret|password|key|token/i;
  const scrubbed = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!SENSITIVE_PATTERN.test(key)) {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

// ─── Helper: Send batch to MCP server ─────────────────────────────────────────
async function sendBatch(events) {
  if (events.length === 0) {
    return;
  }

  const payload = {
    events: events.map(evt => ({
      name: evt.name,
      distinct_id: evt.distinct_id,
      properties: evt.properties,
      timestamp: evt.timestamp,
    })),
  };

  // Try each endpoint in sequence (fallback chain)
  for (const endpoint of MCP_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 5000,
      });

      if (response.ok) {
        return; // Success — stop trying
      }
    } catch (err) {
      // Silently continue to next endpoint
    }
  }

  // All endpoints failed — log locally but never throw
}

// ─── Helper: Flush and reset batch ───────────────────────────────────────────
async function flushBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  const currentBatch = batchQueue;
  batchQueue = [];

  if (currentBatch.length > 0) {
    // Fire-and-forget: never await, never throw
    sendBatch(currentBatch).catch(() => {
      // Silently fail
    });
  }
}

// ─── Helper: Schedule batch flush ────────────────────────────────────────────
function scheduleBatchFlush() {
  if (batchTimer) {
    return; // Already scheduled
  }

  batchTimer = setTimeout(async () => {
    await flushBatch();
  }, BATCH_TIMEOUT_MS);

  // Allow the process to exit even if timer is pending
  if (batchTimer.unref) {
    batchTimer.unref();
  }
}

// ─── Public API: track(eventName, properties) ────────────────────────────────
export function track(eventName, properties = {}) {
  // Early exit if telemetry is disabled
  if (!isTelemetryEnabled()) {
    return Promise.resolve();
  }

  // Build event
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

  // Add to batch queue
  batchQueue.push(event);

  // Flush if batch is full
  if (batchQueue.length >= BATCH_SIZE) {
    flushBatch();
  } else {
    // Schedule flush if not already scheduled
    scheduleBatchFlush();
  }

  // Return promise that resolves immediately (fire-and-forget)
  return Promise.resolve();
}

// ─── Cleanup on process exit ──────────────────────────────────────────────────
// Ensure pending events are flushed before exit
process.on('exit', () => {
  if (batchQueue.length > 0) {
    // Synchronous flush not possible here — rely on async flush above
    // Events may be lost if process exits immediately, but that's acceptable
    // for telemetry (non-critical data)
  }
});

process.on('SIGTERM', () => {
  flushBatch().finally(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  flushBatch().finally(() => {
    process.exit(0);
  });
});

export { flushBatch };
