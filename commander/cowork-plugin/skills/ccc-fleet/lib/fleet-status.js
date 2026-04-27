'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CCC_FLEET_DIR = path.join(os.tmpdir(), 'ccc-fleet');
const CODEX_FLEET_DIR = path.join(os.tmpdir(), 'codex-fleet');
const STATUS_EVENTS_FILE = path.join(CCC_FLEET_DIR, 'worker-progress.jsonl');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function assertString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function normalizeStringArray(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${name} must be an array of strings`);
  }
  return value;
}

function normalizeOptionalBoolean(value, name) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} must be a boolean or null`);
  }
  return value;
}

function normalizeOptionalNumber(value, name) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number or null`);
  }
  return value;
}

function ensureFleetDir(root = CCC_FLEET_DIR) {
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function safeWorkerId(workerId) {
  return assertString(workerId, 'worker_id').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeProgressEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new TypeError('event must be an object');
  }

  return {
    event_kind: 'fleet_worker_progress',
    worker_id: assertString(event.worker_id, 'worker_id'),
    status: assertString(event.status, 'status'),
    files_changed: normalizeStringArray(event.files_changed, 'files_changed'),
    tests_passing: normalizeOptionalBoolean(event.tests_passing, 'tests_passing'),
    eta_remaining_ms: normalizeOptionalNumber(event.eta_remaining_ms, 'eta_remaining_ms'),
  };
}

function emitFleetWorkerProgress(event, options = {}) {
  const payload = normalizeProgressEvent(event);
  const line = `${JSON.stringify(payload)}\n`;
  const statusFile = options.statusFile || STATUS_EVENTS_FILE;
  const stream = options.stream || process.stdout;

  ensureFleetDir(path.dirname(statusFile));
  fs.appendFileSync(statusFile, line, 'utf8');
  stream.write(line);
  return payload;
}

function writeCompletionMarker(workerId, completion, options = {}) {
  if (!completion || typeof completion !== 'object') {
    throw new TypeError('completion must be an object');
  }

  const root = ensureFleetDir(options.root || CCC_FLEET_DIR);
  const id = safeWorkerId(workerId);
  const markerPath = path.join(root, `${id}-complete.json`);
  const tmpPath = path.join(root, `${id}-complete.${process.pid}.tmp`);
  const payload = {
    worker_id: id,
    exit_code: Number.isInteger(completion.exit_code) ? completion.exit_code : null,
    files_written: normalizeStringArray(completion.files_written, 'files_written'),
    commit_hash: completion.commit_hash || null,
    branch_pushed: normalizeOptionalBoolean(completion.branch_pushed, 'branch_pushed'),
    completed_at: new Date().toISOString(),
  };

  if (payload.exit_code === null) {
    throw new TypeError('exit_code must be an integer');
  }
  if (payload.commit_hash !== null && typeof payload.commit_hash !== 'string') {
    throw new TypeError('commit_hash must be a string or null');
  }

  fs.writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, markerPath);
  return { markerPath, payload };
}

function pruneCodexFleetTmp(options = {}) {
  const root = options.root || CODEX_FLEET_DIR;
  const olderThanMs = options.olderThanMs || ONE_DAY_MS;
  const now = options.now || Date.now();
  const removed = [];

  if (!fs.existsSync(root)) {
    return { root, removed };
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    const stats = fs.statSync(entryPath);
    if (now - stats.mtimeMs <= olderThanMs) continue;

    fs.rmSync(entryPath, { recursive: entry.isDirectory(), force: true });
    removed.push(entryPath);
  }

  return { root, removed };
}

module.exports = {
  CCC_FLEET_DIR,
  CODEX_FLEET_DIR,
  STATUS_EVENTS_FILE,
  emitFleetWorkerProgress,
  pruneCodexFleetTmp,
  writeCompletionMarker,
};
