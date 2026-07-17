/**
 * metrics.js
 * Daily rollup for Commander Mission Control's Charts strip (CC-1380 Item 2):
 * ~/.claude/commander/mission-control/metrics.jsonl — one row per
 * (date, source_app):
 *   { date: 'YYYY-MM-DD', source_app, cost_usd, agents_dispatched,
 *     tasks_completed, tool_failures, sessions }
 *
 * $ source of truth: `ccusage daily --json` (v20.0.14) via its per-CLI
 * subcommands (`ccusage claude daily --json`, `ccusage codex daily
 * --json`) — the combined `ccusage daily` view folds every detected CLI
 * into a single `agent: "all"` bucket with no per-agent cost split, so
 * per-source-app cost_usd requires calling the two source-scoped
 * subcommands. Commander tracks Claude + Codex only (public-repo scope
 * rule) — no other source_app is priced. The commander jsonl log files
 * (subagent-runs/agent-runs/tasks/events) are NOT summed for money —
 * their cost fields are historically placeholder-ridden.
 *
 * agents_dispatched is read from mission-control/events.jsonl's
 * `delegation`-type entries (same signal Item 1's derived roster uses)
 * rather than subagent-runs.jsonl, so the count stays consistent across
 * every source_app — subagent-runs.jsonl only ever exists for
 * claude-code (SubagentStart/SubagentStop are dropped by the Codex
 * build — see scripts/build-codex.js HOOK_EVENTS_DROPPED_BY_BUILD).
 *
 * tasks_completed reads events.jsonl's `task`-type entries (TaskCreate/
 * TaskUpdate PostToolUse — a hook Codex keeps), not tasks.jsonl
 * (TaskCreated/TaskCompleted — hooks Codex drops), for the same
 * cross-source-app reason.
 *
 * tool_failures reads ~/.claude/commander/tool-failures.jsonl
 * (post-tool-failure-logger.js, hook: PostToolUseFailure). That hook is
 * ALSO dropped by the Codex build and the log carries no source_app
 * field, so — like Item 1's roster gap — tool_failures can only ever be
 * attributed to claude-code; Codex tool failures are structurally
 * invisible to this metric today. Documented, not fixed here.
 *
 * Gap-filled with zero rows across the requested window so a line chart
 * never draws a misleading flat segment across a day with no data.
 * Latest-wins by (date, source_app) on read, so a re-run replaces a
 * day's row instead of double-counting it.
 *
 * Fail-open everywhere (never throws): a missing/unreadable log file, a
 * missing/failing `ccusage` binary, or a malformed jsonl line all
 * degrade to zero-state for that slice, never a crash.
 *
 * Bounded reads (Item 6 scan discipline): each source log caps at
 * MAX_JSONL_LINES parsed (the most recent lines survive) — a
 * higher-volume log beyond the cap silently undercounts older days in
 * the window. Rotated archives (e.g. events.2026-01-01.jsonl) are never
 * read.
 *
 * Core free forever — no license check, no tier gating.
 */
import { spawn } from 'node:child_process';
import { access, appendFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — same rotation threshold as suggestions.js
const MAX_JSONL_LINES = 5000; // Item 6 bounded-scan cap, per source file
const DEFAULT_DAYS = 56; // 8 weeks — covers both the 30d daily charts and the 8w weekly chart
const CCUSAGE_TIMEOUT_MS = 30_000; // no `timeout` binary on macOS — see runCcusage()

// Kill the whole ccusage process group (it may spawn children) and tear down
// stdio so a hung read can't keep the event loop alive. Detached spawn makes the
// child a group leader, so a negative-pid signal reaches the group.
function hardKill(child) {
  try {
    child.stdout?.destroy();
  } catch {
    // already gone
  }
  try {
    if (child.pid) process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // already exited
    }
  }
}
const CCUSAGE_MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const DELEGATION_TYPE = 'delegation';
const TASK_TYPE = 'task';
// Exact completion statuses — a substring match counts "incomplete"/"not_done"
// as done (both contain "complete"/"done").
const TASK_DONE_STATUSES = new Set([
  'done',
  'complete',
  'completed',
  'closed',
  'resolved',
  'finished',
  'shipped',
  'merged',
]);
function isTaskDone(status) {
  return typeof status === 'string' && TASK_DONE_STATUSES.has(status.trim().toLowerCase());
}

function defaultBaseDir() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude', 'commander');
}

function metricsDir(baseDir) {
  return path.join(baseDir || defaultBaseDir(), 'mission-control');
}

function metricsFile(baseDir) {
  return path.join(metricsDir(baseDir), 'metrics.jsonl');
}

function toolFailuresFile(baseDir) {
  return path.join(baseDir || defaultBaseDir(), 'tool-failures.jsonl');
}

function eventsFile(baseDir) {
  return path.join(metricsDir(baseDir), 'events.jsonl');
}

function subagentRunsFile(baseDir) {
  return path.join(baseDir || defaultBaseDir(), 'subagent-runs.jsonl');
}

function parseTs(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Tail-bounded tolerant JSONL reader — Item 6: cap lines parsed per file,
// keep the most recent MAX_JSONL_LINES non-empty lines, never read
// rotated archives (only ever passed the live, non-dated filename).
async function readJsonlBounded(filePath, maxLines = MAX_JSONL_LINES) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter((line) => line.trim());
  const tail = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;

  const entries = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

function dateKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// ccusage --since wants YYYYMMDD (no dashes).
function toCcusageSince(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

/**
 * Spawn `ccusage` with a self-implemented kill-timer — macOS has no
 * `timeout` binary (GNU coreutils only), so a hung/misbehaving `ccusage`
 * is killed by our own setTimeout guard rather than shelling out to a
 * binary that may not exist. Resolves stdout on success, null on any
 * failure (missing binary, non-zero exit, timeout, oversized output) —
 * never throws, never rejects.
 */
function runCcusage(args, { timeoutMs = CCUSAGE_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    try {
      child = spawn('ccusage', args, { stdio: ['ignore', 'pipe', 'ignore'], detached: true });
    } catch {
      resolve(null);
      return;
    }

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      hardKill(child);
      finish(null);
    }, timeoutMs);
    // Never let the guard timer keep the process alive on its own.
    if (typeof timer.unref === 'function') timer.unref();

    const chunks = [];
    let bytes = 0;
    child.stdout?.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > CCUSAGE_MAX_OUTPUT_BYTES) {
        hardKill(child);
        finish(null);
        return;
      }
      chunks.push(chunk);
    });

    child.once('error', () => finish(null));
    child.once('close', (code) => {
      if (code !== 0) {
        finish(null);
        return;
      }
      finish(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

// The real `ccusage` invocation is deduped by exact args for
// CCUSAGE_CACHE_TTL_MS — Item 6's "N concurrent pollers don't each
// re-read" applies just as much to "don't each re-shell-out": a spawn
// costs real wall-clock time no matter how many mission-model.js
// callers ask for the same (subcommand, since) window inside a few
// seconds of each other. Only wraps the DEFAULT runner — an injected
// test runner is assumed to already be instant/deterministic and is
// never cached, so tests stay isolated from each other.
const CCUSAGE_CACHE_TTL_MS = 30_000;
const ccusageCallCache = new Map(); // JSON(args) -> { expiresAt, promise }

function cachedRunCcusage(args) {
  const key = JSON.stringify(args);
  const now = Date.now();
  const hit = ccusageCallCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = runCcusage(args);
  ccusageCallCache.set(key, { expiresAt: now + CCUSAGE_CACHE_TTL_MS, promise });
  promise.catch(() => {
    if (ccusageCallCache.get(key)?.promise === promise) ccusageCallCache.delete(key);
  });
  return promise;
}

async function fetchCcusageDaily(subcommand, sinceYYYYMMDD, runner) {
  const raw = await runner([subcommand, 'daily', '--json', '--since', sinceYYYYMMDD]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.daily) ? parsed.daily : [];
  } catch {
    return [];
  }
}

// claude-code rows key cost as `totalCost`; codex rows key it as
// `costUSD` — different field names per ccusage subcommand output shape
// (verified against ccusage 20.0.14).
async function ccusageCostByDate(sourceApp, sinceYYYYMMDD, runner) {
  const map = new Map();
  try {
    if (sourceApp === 'claude-code') {
      const rows = await fetchCcusageDaily('claude', sinceYYYYMMDD, runner);
      for (const row of rows) {
        if (row && typeof row.date === 'string' && Number.isFinite(row.totalCost)) {
          map.set(row.date, row.totalCost);
        }
      }
    } else if (sourceApp === 'codex') {
      const rows = await fetchCcusageDaily('codex', sinceYYYYMMDD, runner);
      for (const row of rows) {
        if (row && typeof row.date === 'string' && Number.isFinite(row.costUSD)) {
          map.set(row.date, row.costUSD);
        }
      }
    }
  } catch {
    // fail-open: zero-state for this source's cost
  }
  return map;
}

function emptyRow(date, sourceApp) {
  return {
    date,
    source_app: sourceApp,
    cost_usd: 0,
    agents_dispatched: 0,
    tasks_completed: 0,
    tool_failures: 0,
    sessions: 0,
  };
}

function dateRange(days, nowMs) {
  const dates = [];
  const endUtcMs = Date.UTC(
    new Date(nowMs).getUTCFullYear(),
    new Date(nowMs).getUTCMonth(),
    new Date(nowMs).getUTCDate()
  );
  for (let i = days - 1; i >= 0; i -= 1) {
    dates.push(dateKey(endUtcMs - i * 86_400_000));
  }
  return dates;
}

/**
 * Compute fresh daily rollup rows for the trailing `days` window ending
 * at `now` (default DEFAULT_DAYS = 56, covering both the 30d daily
 * charts and the 8w weekly chart). Reads existing commander logs plus
 * `ccusage`. Fail-open: any source erroring yields zero-state for that
 * slice, never a throw. `runner` is an injectable ccusage-invoker seam
 * for tests (defaults to the real spawn-based runCcusage).
 */
async function buildMetrics({ baseDir, now, days, runner } = {}) {
  const root = baseDir || defaultBaseDir();
  const nowMs = now instanceof Date ? now.getTime() : Number.isFinite(now) ? now : Date.now();
  const windowDays = Number.isInteger(days) && days > 0 ? days : DEFAULT_DAYS;
  const dates = dateRange(windowDays, nowMs);
  const earliestMs = Date.parse(`${dates[0]}T00:00:00.000Z`);
  const ccusageRunner = typeof runner === 'function' ? runner : cachedRunCcusage;

  const [subagentStarts, eventEntries, taskEntries, failureEntries] = await Promise.all([
    readJsonlBounded(subagentRunsFile(root)),
    readJsonlBounded(eventsFile(root)),
    readJsonlBounded(path.join(root, 'tasks.jsonl')),
    readJsonlBounded(toolFailuresFile(root)),
  ]);
  void taskEntries; // tasks.jsonl is claude-code-only and superseded by events.jsonl's
  // source_app-aware `task` entries below — read for parity/documentation only.

  const rowByKey = new Map();
  const sourceAppsSeen = new Set();

  function rowFor(date, sourceApp) {
    const key = `${date}::${sourceApp}`;
    let row = rowByKey.get(key);
    if (!row) {
      row = emptyRow(date, sourceApp);
      rowByKey.set(key, row);
      sourceAppsSeen.add(sourceApp);
    }
    return row;
  }

  const sessionSets = new Map(); // "date::sourceApp" -> Set<sessionId>

  function trackSession(date, sourceApp, sessionId) {
    if (sessionId === null || sessionId === undefined || sessionId === '') return;
    const key = `${date}::${sourceApp}`;
    let set = sessionSets.get(key);
    if (!set) {
      set = new Set();
      sessionSets.set(key, set);
    }
    set.add(String(sessionId));
  }

  // agents_dispatched + sessions (claude-code baseline signal): subagent-runs.jsonl
  // is always claude-code (Item 1 legacy-file rule).
  for (const start of subagentStarts) {
    const ms = parseTs(start?.ts);
    if (ms === null || ms < earliestMs || ms > nowMs) continue;
    const date = dateKey(ms);
    trackSession(date, 'claude-code', start.session_id ?? start.sessionId ?? null);
  }

  // agents_dispatched, tasks_completed, sessions (cross-source-app signal):
  // mission-control/events.jsonl — PostToolUse-backed, so Codex keeps writing it.
  for (const entry of eventEntries) {
    const ms = parseTs(entry?.ts);
    if (ms === null || ms < earliestMs || ms > nowMs) continue;
    const date = dateKey(ms);
    const sourceApp = typeof entry.source_app === 'string' && entry.source_app.trim()
      ? entry.source_app.trim()
      : 'claude-code';
    const sessionId = entry.session_id ?? entry.sessionId ?? null;
    trackSession(date, sourceApp, sessionId);

    if (entry.type === DELEGATION_TYPE && typeof entry.actor === 'string' && entry.actor.trim()) {
      rowFor(date, sourceApp).agents_dispatched += 1;
    }
    if (entry.type === TASK_TYPE && isTaskDone(entry.status)) {
      rowFor(date, sourceApp).tasks_completed += 1;
    }
  }

  // tool_failures: always claude-code — PostToolUseFailure is dropped by the
  // Codex build and tool-failures.jsonl carries no source_app field.
  for (const entry of failureEntries) {
    const ms = parseTs(entry?.ts);
    if (ms === null || ms < earliestMs || ms > nowMs) continue;
    rowFor(dateKey(ms), 'claude-code').tool_failures += 1;
  }

  for (const [key, set] of sessionSets) {
    const [date, sourceApp] = key.split('::');
    rowFor(date, sourceApp).sessions = set.size;
  }

  // cost_usd — Claude + Codex only (public-repo scope rule).
  const sinceYYYYMMDD = toCcusageSince(earliestMs);
  const [claudeCost, codexCost] = await Promise.all([
    ccusageCostByDate('claude-code', sinceYYYYMMDD, ccusageRunner),
    ccusageCostByDate('codex', sinceYYYYMMDD, ccusageRunner),
  ]);
  for (const [sourceApp, costByDate] of [
    ['claude-code', claudeCost],
    ['codex', codexCost],
  ]) {
    for (const [date, cost] of costByDate) {
      if (!dates.includes(date)) continue;
      rowFor(date, sourceApp).cost_usd = Number(cost.toFixed(4));
    }
    if (costByDate.size > 0) sourceAppsSeen.add(sourceApp);
  }

  // Every source_app that showed ANY signal in this window (agent
  // dispatch, a task, a session, or — for the two tracked apps — a
  // priced day) gets a full, gap-filled run of dates, including zero
  // rows, so a chart never draws a misleading flat line across a day
  // with no data.
  const rows = [];
  for (const sourceApp of sourceAppsSeen) {
    for (const date of dates) {
      rows.push(rowFor(date, sourceApp));
    }
  }

  return rows.sort((left, right) =>
    left.date === right.date
      ? left.source_app.localeCompare(right.source_app)
      : left.date.localeCompare(right.date)
  );
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function rotateLog(dir, file) {
  try {
    const info = await stat(file);
    if (info.size < MAX_BYTES) return;
    const now = new Date();
    const datestamp =
      now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    const timestamp = pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    let archive = path.join(dir, `metrics.${datestamp}-${timestamp}.jsonl`);
    let counter = 1;
    while (await fileExists(archive)) {
      archive = path.join(dir, `metrics.${datestamp}-${timestamp}-${counter}.jsonl`);
      counter += 1;
    }
    await rename(file, archive);
  } catch {
    // File doesn't exist yet or stat failed — that's fine
  }
}

/**
 * Append computed rows to metrics.jsonl. Returns true on success, false
 * on any failure — never throws. Rotates at 10MB (same pattern as
 * suggestions.js).
 */
async function appendMetrics(rows, { baseDir } = {}) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return true;
    const root = baseDir || defaultBaseDir();
    const dir = metricsDir(root);
    const file = metricsFile(root);

    const lines = rows
      .filter((row) => row && typeof row.date === 'string' && typeof row.source_app === 'string')
      .map((row) =>
        JSON.stringify({
          date: row.date,
          source_app: row.source_app,
          cost_usd: Number.isFinite(row.cost_usd) ? row.cost_usd : 0,
          agents_dispatched: Number.isFinite(row.agents_dispatched) ? row.agents_dispatched : 0,
          tasks_completed: Number.isFinite(row.tasks_completed) ? row.tasks_completed : 0,
          tool_failures: Number.isFinite(row.tool_failures) ? row.tool_failures : 0,
          sessions: Number.isFinite(row.sessions) ? row.sessions : 0,
        })
      );
    if (lines.length === 0) return true;

    await mkdir(dir, { recursive: true });
    await rotateLog(dir, file);
    await appendFile(file, lines.join('\n') + '\n');
    return true;
  } catch {
    return false;
  }
}

// Latest-wins merge by (date, source_app) — same pattern as
// suggestions.js's latestSuggestions()/mission-model.js's latestTasks().
// A metrics.jsonl file can carry many appended computations of the same
// day (each poll's buildMetrics recompute); the most recently appended
// line for a given (date, source_app) wins.
function latestByDateSource(entries) {
  const byKey = new Map();
  const order = [];
  for (const entry of entries) {
    if (!entry || typeof entry.date !== 'string' || typeof entry.source_app !== 'string') continue;
    const key = `${entry.date}::${entry.source_app}`;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, {
      date: entry.date,
      source_app: entry.source_app,
      cost_usd: Number.isFinite(entry.cost_usd) ? entry.cost_usd : 0,
      agents_dispatched: Number.isFinite(entry.agents_dispatched) ? entry.agents_dispatched : 0,
      tasks_completed: Number.isFinite(entry.tasks_completed) ? entry.tasks_completed : 0,
      tool_failures: Number.isFinite(entry.tool_failures) ? entry.tool_failures : 0,
      sessions: Number.isFinite(entry.sessions) ? entry.sessions : 0,
    });
  }
  return order.map((key) => byKey.get(key));
}

/**
 * Tolerant read of metrics.jsonl, merged latest-wins by (date,
 * source_app), sorted by date ascending. Missing file → []. Never
 * throws.
 */
async function readMetrics({ baseDir } = {}) {
  try {
    const entries = await readJsonlBounded(metricsFile(baseDir));
    return latestByDateSource(entries).sort((left, right) =>
      left.date === right.date
        ? left.source_app.localeCompare(right.source_app)
        : left.date.localeCompare(right.date)
    );
  } catch {
    return [];
  }
}

// Merge freshly-built rows over the existing bounded rollup (fresh wins per
// date+source, older out-of-window dates preserved) and atomic-write the whole
// set once — tmp file + rename. Keeps metrics.jsonl bounded instead of growing
// on every poll. Returns the merged, sorted rows. Never throws.
async function persistMerged(rows, baseDir) {
  const root = baseDir || defaultBaseDir();
  const dir = metricsDir(root);
  const file = metricsFile(root);
  try {
    const byKey = new Map();
    for (const row of await readMetrics({ baseDir: root })) {
      byKey.set(`${row.date}::${row.source_app}`, row);
    }
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || typeof row.date !== 'string' || typeof row.source_app !== 'string') continue;
      byKey.set(`${row.date}::${row.source_app}`, {
        date: row.date,
        source_app: row.source_app,
        cost_usd: Number.isFinite(row.cost_usd) ? row.cost_usd : 0,
        agents_dispatched: Number.isFinite(row.agents_dispatched) ? row.agents_dispatched : 0,
        tasks_completed: Number.isFinite(row.tasks_completed) ? row.tasks_completed : 0,
        tool_failures: Number.isFinite(row.tool_failures) ? row.tool_failures : 0,
        sessions: Number.isFinite(row.sessions) ? row.sessions : 0,
      });
    }
    const merged = [...byKey.values()].sort((left, right) =>
      left.date === right.date
        ? left.source_app.localeCompare(right.source_app)
        : left.date.localeCompare(right.date)
    );
    await mkdir(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, merged.map((row) => JSON.stringify(row)).join('\n') + (merged.length ? '\n' : ''));
    await rename(tmp, file);
    return merged;
  } catch {
    return readMetrics({ baseDir: root });
  }
}

/**
 * Compute → persist → read-back the merged history, filtered to the
 * requested window. This is the entry point mission-model.js and
 * mission-control-snapshot.js call (each behind their own 30s TTL
 * cache — see Item 6). Never throws.
 */
async function getMetrics({ baseDir, now, days, runner } = {}) {
  try {
    const rows = await buildMetrics({ baseDir, now, days, runner });
    // Atomic-replace, not append: getMetrics runs on every (cache-missed) poll,
    // and appending the whole rollup each time grows the file without bound
    // (~15KB/poll). Merge fresh rows over the existing bounded set, keep older
    // dates outside the window, and write the file once.
    const merged = await persistMerged(rows, baseDir);
    const nowMs = now instanceof Date ? now.getTime() : Number.isFinite(now) ? now : Date.now();
    const windowDays = Number.isInteger(days) && days > 0 ? days : DEFAULT_DAYS;
    const wantedDates = new Set(dateRange(windowDays, nowMs));
    return merged.filter((row) => wantedDates.has(row.date));
  } catch {
    return [];
  }
}

export {
  appendMetrics,
  buildMetrics,
  getMetrics,
  metricsFile,
  readMetrics,
  runCcusage,
  DEFAULT_DAYS as DEFAULT_METRICS_DAYS,
};
