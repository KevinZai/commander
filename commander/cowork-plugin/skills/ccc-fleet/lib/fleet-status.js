'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const laneState = require('../../../lib/lane-state.js');

// Fleet state lives in an owner-only per-run directory under the lane state dir:
//   <config dir>/commander/fleet/            0700, owned by this user
//   <config dir>/commander/fleet/current     0600, the id of the active run
//   <config dir>/commander/fleet/runs/<id>/  0700, one per run: worker-progress.jsonl, <worker>-complete.json
// It used to be one shared ccc-fleet dir under os.tmpdir(), which any local user could read or plant markers in.
// The writers below, /ccc-fleet-viz and the fleet-watch monitor all resolve the run through currentRunDir().
const CODEX_FLEET_DIR = path.join(os.tmpdir(), 'codex-fleet');
const PROGRESS_FILE = 'worker-progress.jsonl';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PRIVATE_DIR_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const POSIX = process.platform !== 'win32';

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

/** <lane state dir>/fleet — the parent of every run. */
function fleetBaseDir(options = {}) {
  return path.join(laneState.stateDir(options.env), 'fleet');
}

function ownedByMe(stats) {
  return !POSIX || typeof process.getuid !== 'function' || stats.uid === process.getuid();
}

/** A real directory (not a symlink), owned by this user, with no group or other permission bits. */
function isPrivateDir(dir) {
  let stats;
  try {
    stats = fs.lstatSync(dir);
  } catch (_) {
    return false;
  }
  if (!stats.isDirectory() || !ownedByMe(stats)) return false;
  return !POSIX || (stats.mode & 0o077) === 0;
}

/** Create `dir` 0700 if missing; tighten one we own; refuse a symlink or another user's directory. */
function ensurePrivateDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  const stats = fs.lstatSync(dir);
  if (!stats.isDirectory()) throw new Error(`fleet state path is not a directory: ${dir}`);
  if (!ownedByMe(stats)) throw new Error(`fleet state dir is owned by another user: ${dir}`);
  if (POSIX && (stats.mode & 0o077) !== 0) fs.chmodSync(dir, PRIVATE_DIR_MODE);
  return dir;
}

function newRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${stamp}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Start a fleet run: a fresh 0700 directory under <base>/runs/ that becomes the current run.
 * Returns { runId, runDir }.
 */
function startFleetRun(options = {}) {
  const runId = options.runId === undefined ? newRunId() : options.runId;
  if (typeof runId !== 'string' || !RUN_ID_RE.test(runId)) {
    throw new TypeError('runId must match [A-Za-z0-9][A-Za-z0-9._-]{0,79}');
  }
  const base = ensurePrivateDir(fleetBaseDir(options));
  const runs = ensurePrivateDir(path.join(base, 'runs'));
  const runDir = path.join(runs, runId);
  fs.mkdirSync(runDir, { mode: PRIVATE_DIR_MODE });   // not recursive: an existing run is never reused
  const pointer = path.join(base, 'current');
  const tmp = path.join(base, `current.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`);
  fs.writeFileSync(tmp, `${runId}\n`, { encoding: 'utf8', mode: PRIVATE_FILE_MODE });
  fs.renameSync(tmp, pointer);
  return { runId, runDir };
}

/** The current run's directory when it exists and passes the ownership and mode checks; else null. */
function currentRunDir(options = {}) {
  const base = fleetBaseDir(options);
  if (!isPrivateDir(base)) return null;
  const pointer = path.join(base, 'current');
  let runId;
  try {
    const stats = fs.lstatSync(pointer);
    if (!stats.isFile() || !ownedByMe(stats)) return null;
    runId = fs.readFileSync(pointer, 'utf8').trim();
  } catch (_) {
    return null;
  }
  if (!RUN_ID_RE.test(runId)) return null;
  const runs = path.join(base, 'runs');
  if (!isPrivateDir(runs)) return null;
  const runDir = path.join(runs, runId);
  return isPrivateDir(runDir) ? runDir : null;
}

/** The current run's directory, starting a new run when there is none (or the current one fails its checks). */
function ensureRunDir(options = {}) {
  return currentRunDir(options) || startFleetRun({ env: options.env }).runDir;
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
  const stream = options.stream || process.stdout;
  let statusFile = options.statusFile;
  if (statusFile) fs.mkdirSync(path.dirname(statusFile), { recursive: true, mode: PRIVATE_DIR_MODE });
  else statusFile = path.join(options.root || ensureRunDir(options), PROGRESS_FILE);

  fs.appendFileSync(statusFile, line, { encoding: 'utf8', mode: PRIVATE_FILE_MODE });
  stream.write(line);
  return payload;
}

function writeCompletionMarker(workerId, completion, options = {}) {
  if (!completion || typeof completion !== 'object') {
    throw new TypeError('completion must be an object');
  }

  let root = options.root;
  if (root) fs.mkdirSync(root, { recursive: true, mode: PRIVATE_DIR_MODE });
  else root = ensureRunDir(options);
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

  fs.writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: PRIVATE_FILE_MODE });
  fs.renameSync(tmpPath, markerPath);
  return { markerPath, payload };
}

function pruneFleetTmp(options = {}) {
  // Default: the run directories under <base>/runs/, never the current run. options.root prunes the
  // entries of that one directory instead. (The old codex-fleet and ccc-fleet dirs under os.tmpdir() are legacy
  // locations nothing writes to any more.)
  const root = options.root || path.join(fleetBaseDir(options), 'runs');
  const olderThanMs = options.olderThanMs || ONE_DAY_MS;
  const now = options.now || Date.now();
  const removed = [];
  const keep = options.root ? null : currentRunDir(options);

  if (!fs.existsSync(root)) {
    return { root, removed };
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (keep && entryPath === keep) continue;
    const stats = fs.statSync(entryPath);
    if (now - stats.mtimeMs <= olderThanMs) continue;

    fs.rmSync(entryPath, { recursive: entry.isDirectory(), force: true });
    removed.push(entryPath);
  }

  return { root, removed };
}

module.exports = {
  CODEX_FLEET_DIR,
  PROGRESS_FILE,
  currentRunDir,
  emitFleetWorkerProgress,
  ensureRunDir,
  fleetBaseDir,
  isPrivateDir,
  startFleetRun,
  pruneFleetTmp,
  // Back-compat alias for the legacy export name.
  pruneCodexFleetTmp: pruneFleetTmp,
  writeCompletionMarker,
};
