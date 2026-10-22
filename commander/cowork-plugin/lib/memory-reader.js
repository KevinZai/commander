/**
 * memory-reader.js
 * The Commander Console's Memory section (v7.4.0 Phase 2) — a read-only
 * view of the user's OWN claude-mem store at ~/.claude-mem/claude-mem.db.
 *
 * claude-mem is AGPL-3.0 and Commander is MIT, so it is deliberately NOT
 * bundled and NOT vendored. This file never installs it, never writes to it,
 * and never assumes it exists: **"not installed" is the NORMAL case**, and it
 * resolves to `{available: false, unavailableReason}` — a card, never an error,
 * never an `errors` entry, never a nag.
 *
 * The reading technique is lifted from dashboard/lib/history.js (the v6.8.3
 * Mission Control History panel), which already solved every hazard here:
 * node:sqlite feature-detection, read-only open, WAL busy_timeout against the
 * live claude-mem writer, `merged_into_project IS NULL` so folded rows don't
 * double-count, cursoring on the existing created_at_epoch DESC index rather
 * than a full scan, and fail-open on every error path. It is ADAPTED rather
 * than imported: the plugin ships without dashboard/, so anything
 * console-model.js needs has to live inside this lib/ tree (same precedent as
 * metrics.js / top-skills.js / charts.js). The dashboard keeps its own copy —
 * they are two consumers of one technique, not one module with two homes.
 *
 * ─── Privacy ───────────────────────────────────────────────────────────────
 * Only id / project / type / title / created_at_epoch are ever SELECTed. The
 * text / facts / narrative / concepts / files_* columns hold raw session
 * content and are never read, so they cannot reach a rendered — let alone a
 * published — surface.
 *
 * Even a title is user-adjacent free text: claude-mem summarises whatever the
 * session touched, so a pasted key or an absolute home path can land in one.
 * Every title and project therefore goes through safety-snapshot.js's
 * `redactedSample()` — the same secret-pattern library + `<home>` fold the
 * Safety deck uses on tool-error text — and is then capped at TITLE_MAX. One
 * redactor, one place to fix a gap.
 *
 * Bounded: at most OBSERVATION_CAP rows are materialised, and the two count
 * queries are range-scans over the index (measured ~20ms against a 536MB
 * store), never a full-table COUNT(*).
 *
 * Zero new deps, ESM, read-only, deterministic given (db, now). Nothing here
 * throws. Core free forever — no license check, no tier gating.
 */
import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { redactedSample } from './safety-snapshot.js';

const OBSERVATION_CAP = 20;
const TOP_PROJECTS = 5;
const TITLE_MAX = 200;
const PROJECT_MAX = 80;
const BUSY_TIMEOUT_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

const NOT_INSTALLED =
  'claude-mem not detected — install it separately to see session memory here.';
const NO_SQLITE =
  'This Node build has no node:sqlite, so Commander cannot read the claude-mem store.';
const UNREADABLE = 'The claude-mem store is present but could not be read.';

let sqliteModulePromise;

// Cached per process: node:sqlite's presence never changes at runtime, and
// re-importing repeats its ExperimentalWarning on every render.
function loadSqliteModule() {
  if (!sqliteModulePromise) {
    sqliteModulePromise = import('node:sqlite').catch(() => null);
  }
  return sqliteModulePromise;
}

function defaultDbPath() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude-mem', 'claude-mem.db');
}

function toMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// redactedSample() already collapses whitespace, folds /Users/<name> to <home>
// and applies the full secret-pattern library; it caps at its own 240. Capping
// again at TITLE_MAX is a widget/artifact layout concern, not a second redactor.
function safeText(value, max) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const cleaned = redactedSample(value);
  if (!cleaned || cleaned === '(no error text)') return null;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function unavailable(reason, nowMs) {
  return {
    available: false,
    unavailableReason: reason,
    observations: [],
    projects: [],
    counts: { last7d: 0, last30d: 0, shown: 0 },
    dataThroughMs: null,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the Memory section model.
 *
 * Always resolves. A machine without claude-mem gets
 * `{available: false, unavailableReason: <friendly sentence>}` and empty
 * collections — the renderers show a quiet hint card for that, never an error
 * block and never a fabricated zero.
 *
 * @param {object} [opts]
 * @param {string} [opts.dbPath]  override the store location (tests)
 * @param {string|number|Date} [opts.now]  pinned clock; defaults to Date.now()
 * @returns {Promise<object>} {available, unavailableReason, observations,
 *   projects, counts, dataThroughMs, generatedAt}
 */
async function readMemoryModel({ dbPath, now } = {}) {
  const nowMs = toMs(now) ?? Date.now();

  let resolvedPath;
  try {
    resolvedPath = dbPath || defaultDbPath();
    if (!(await fileExists(resolvedPath))) return unavailable(NOT_INSTALLED, nowMs);
  } catch {
    // A non-string dbPath makes path.join throw — treat it as "no store".
    return unavailable(NOT_INSTALLED, nowMs);
  }

  const sqliteModule = await loadSqliteModule();
  if (!sqliteModule || typeof sqliteModule.DatabaseSync !== 'function') {
    return unavailable(NO_SQLITE, nowMs);
  }

  let db;
  try {
    db = new sqliteModule.DatabaseSync(resolvedPath, { readOnly: true });
    db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);

    const rows = db
      .prepare(
        `SELECT id, project, type, title, created_at_epoch FROM observations
         WHERE merged_into_project IS NULL
         ORDER BY created_at_epoch DESC LIMIT ?`
      )
      .all(OBSERVATION_CAP);

    const countSince = db.prepare(
      `SELECT COUNT(*) AS total FROM observations
       WHERE created_at_epoch > ? AND merged_into_project IS NULL`
    );
    const countFor = (windowMs) => {
      const result = countSince.all(nowMs - windowMs);
      const total = result && result[0] ? Number(result[0].total) : 0;
      return Number.isFinite(total) ? total : 0;
    };

    const observations = rows
      .map((row) => ({
        id: Number.isFinite(row.id) ? row.id : null,
        ts: Number.isFinite(row.created_at_epoch) ? row.created_at_epoch : null,
        type: safeText(row.type, 40) || 'discovery',
        title: safeText(row.title, TITLE_MAX) || '(untitled)',
        project: safeText(row.project, PROJECT_MAX),
      }))
      .filter((row) => row.ts !== null);

    const byProject = new Map();
    for (const row of observations) {
      const key = row.project || 'unknown';
      byProject.set(key, (byProject.get(key) || 0) + 1);
    }
    const projects = [...byProject.entries()]
      .map(([project, count]) => ({ project, count }))
      .sort((left, right) => right.count - left.count || left.project.localeCompare(right.project))
      .slice(0, TOP_PROJECTS);

    const dataThroughMs = observations.length ? observations[0].ts : null;

    return {
      available: true,
      unavailableReason: null,
      observations,
      projects,
      counts: {
        last7d: countFor(7 * DAY_MS),
        last30d: countFor(30 * DAY_MS),
        shown: observations.length,
      },
      dataThroughMs,
      generatedAt: new Date(nowMs).toISOString(),
    };
  } catch {
    // A locked, corrupt or schema-drifted store is still not an error state for
    // the console — it is a card that says memory is unreadable right now.
    return unavailable(UNREADABLE, nowMs);
  } finally {
    try {
      db?.close();
    } catch {
      // already closed / never opened
    }
  }
}

export { defaultDbPath, readMemoryModel, NOT_INSTALLED, NO_SQLITE, UNREADABLE };
