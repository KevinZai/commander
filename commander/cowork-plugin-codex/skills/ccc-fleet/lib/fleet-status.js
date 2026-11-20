'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const laneState = require('../../../lib/lane-state.js');

// Fleet state lives in an owner-only per-run directory under the lane state dir:
//   <config dir>/commander/fleet/            0700, owned by this user
//   <config dir>/commander/fleet/current     0600, the id of the active run
//   <config dir>/commander/fleet/runs/<id>/  0700, one per run: worker-progress.jsonl, <markerStem>-complete.json
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

/** The directory of run `runId` when it exists and passes the ownership and mode checks; throws otherwise. */
function runDirFor(runId, options = {}) {
  if (typeof runId !== 'string' || !RUN_ID_RE.test(runId)) {
    throw new TypeError('runId must match [A-Za-z0-9][A-Za-z0-9._-]{0,79}');
  }
  const base = fleetBaseDir(options);
  const runs = path.join(base, 'runs');
  const runDir = path.join(runs, runId);
  if (!isPrivateDir(base) || !isPrivateDir(runs) || !isPrivateDir(runDir)) {
    throw new Error(`fleet run ${runId} does not exist or is not a private directory`);
  }
  return runDir;
}

/**
 * The run a worker writes to. A worker started for a run keeps writing there even after a later run becomes
 * current: options.runId, else CCC_FLEET_RUN_ID from options.env or process.env. Only without a run id does it use
 * the current run (starting one when there is none or the current one fails its checks).
 */
function ensureRunDir(options = {}) {
  const env = options.env || process.env;
  const runId = options.runId !== undefined ? options.runId : env.CCC_FLEET_RUN_ID;
  if (runId !== undefined && runId !== '') return runDirFor(runId, options);
  return currentRunDir(options) || startFleetRun({ env: options.env }).runDir;
}

// The filename stem for a worker's marker: sha256 of the exact worker id, hex, truncated to 32 characters
// (128 bits). Every id is hashed, plain ones included, so no id can produce another id's filename (`a b` vs
// `a_b-c8687a08`, `W1` vs `w1` on a case-insensitive volume) and the name stays short for any id length. The
// marker payload carries the exact id (Codex #302 delta4): readers key workers by it, never by the filename.
function markerStem(workerId) {
  const id = assertString(workerId, 'worker_id');
  return crypto.createHash('sha256').update(id, 'utf8').digest('hex').slice(0, 32);
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
  const stem = markerStem(workerId);
  const markerPath = path.join(root, `${stem}-complete.json`);
  const tmpPath = path.join(root, `${stem}-complete.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`);
  const payload = {
    worker_id: workerId,
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

// When an entry last changed. For a directory that is the newest mtime of the directory and its direct entries
// (lstat, never following a link): appending to worker-progress.jsonl does not touch the directory's own mtime,
// so a still-active overlapping run would otherwise look old (Codex #302 delta3 NM2).
function lastActivityMs(entryPath, stats) {
  if (!stats.isDirectory()) return stats.mtimeMs;
  let newest = stats.mtimeMs;
  for (const name of fs.readdirSync(entryPath)) {
    try {
      newest = Math.max(newest, fs.lstatSync(path.join(entryPath, name)).mtimeMs);
    } catch (_) { /* removed while we looked: no newer activity to count */ }
  }
  return newest;
}

// Worker statuses that end a worker. Anything else (running, queued, testing, blocked, unknown) is unsettled.
const TERMINAL_STATUSES = new Set([
  'done', 'complete', 'completed', 'success', 'succeeded', 'pass', 'passed',
  'failed', 'failure', 'error', 'errored', 'cancelled', 'canceled', 'aborted', 'killed', 'skipped',
]);

function isTerminalStatus(status) {
  return typeof status === 'string' && TERMINAL_STATUSES.has(status.trim().toLowerCase().replace(/[\s-]+/g, '_'));
}

function readJsonOrNull(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) return null;   // a malformed marker settles nothing
    throw err;
  }
}

// Whether a run still has a worker that has not settled: its newest progress or status-marker status is not
// terminal and it has no completion marker. Cleanup never prunes such a run, however old it looks (Codex #302
// delta4): a slow worker that stops writing for a day is not a dead one. Read errors propagate to the caller.
function runHasUnsettledWorker(runDir) {
  const latest = new Map();
  let progress = '';
  try {
    progress = fs.readFileSync(path.join(runDir, PROGRESS_FILE), 'utf8');
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
  for (const line of progress.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch (_) { continue; }
    if (event && typeof event.worker_id === 'string' && typeof event.status === 'string') {
      latest.set(event.worker_id, event.status);
    }
  }
  const completed = new Set();
  for (const name of fs.readdirSync(runDir)) {
    const kind = name.endsWith('-complete.json') ? 'complete' : name.endsWith('-status.json') ? 'status' : null;
    if (!kind) continue;
    const payload = readJsonOrNull(path.join(runDir, name));
    if (!payload || typeof payload !== 'object') continue;
    const id = typeof payload.worker_id === 'string' ? payload.worker_id : name.slice(0, -`-${kind}.json`.length);
    if (kind === 'complete') completed.add(id);
    else if (!latest.has(id)) latest.set(id, payload.status || payload.state || payload.phase);
  }
  for (const [id, status] of latest) {
    if (!completed.has(id) && !isTerminalStatus(status)) return true;
  }
  return false;
}

function pruneFleetTmp(options = {}) {
  // Default: the run directories under <base>/runs/, never the current run. options.root prunes the
  // entries of that one directory instead. (The old codex-fleet and ccc-fleet dirs under os.tmpdir() are legacy
  // locations nothing writes to any more.)
  // Cleanup never leaves the run store: the default store (fleet/ and fleet/runs/) must be private real directories,
  // an explicit root must be a real directory (lstat, not a symlink), and an entry that is a symlink is removed as a
  // link without following it. A run is aged by its newest marker, not the directory mtime, and a run with a
  // worker that has not settled is never removed. Returns { root, removed, skipped }.
  const base = fleetBaseDir(options);
  const root = options.root || path.join(base, 'runs');
  const olderThanMs = options.olderThanMs || ONE_DAY_MS;
  const now = options.now || Date.now();
  const removed = [];
  const skipped = [];
  const keep = options.root ? null : currentRunDir(options);

  let rootStats;
  try {
    rootStats = fs.lstatSync(root);
  } catch (err) {
    if (err && err.code === 'ENOENT') return { root, removed, skipped };
    throw err;
  }
  if (rootStats.isSymbolicLink()) throw new Error(`refusing to prune a symlinked fleet dir: ${root}`);
  if (!rootStats.isDirectory()) throw new Error(`fleet prune root is not a directory: ${root}`);
  if (!options.root && (!isPrivateDir(base) || !isPrivateDir(root))) {
    throw new Error(`refusing to prune: fleet run store is not a private directory: ${root}`);
  }

  // Each entry is handled on its own: one that cannot be read or removed is reported in `skipped` and kept,
  // and cleanup of the others continues (Codex #302 delta4).
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (keep && entryPath === keep) continue;
    try {
      const stats = fs.lstatSync(entryPath);
      if (now - lastActivityMs(entryPath, stats) <= olderThanMs) continue;
      if (!options.root && stats.isDirectory() && runHasUnsettledWorker(entryPath)) continue;

      if (stats.isDirectory()) fs.rmSync(entryPath, { recursive: true, force: true });
      else fs.unlinkSync(entryPath);   // a file or a symlink: the link itself, never its target
      removed.push(entryPath);
    } catch (err) {
      skipped.push({ path: entryPath, reason: (err && (err.code || err.message)) || String(err) });
    }
  }

  return { root, removed, skipped };
}

module.exports = {
  CODEX_FLEET_DIR,
  PROGRESS_FILE,
  currentRunDir,
  emitFleetWorkerProgress,
  ensureRunDir,
  fleetBaseDir,
  isPrivateDir,
  markerStem,
  startFleetRun,
  pruneFleetTmp,
  runDirFor,
  // Back-compat alias for the legacy export name.
  pruneCodexFleetTmp: pruneFleetTmp,
  writeCompletionMarker,
};
