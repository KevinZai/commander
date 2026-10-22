/**
 * history.js
 * Read-only claude-mem History panel for Commander Mission Control
 * (CC-1380 Item 5, reader half) — a timeline over
 * ~/.claude-mem/claude-mem.db (SQLite, WAL — concurrent reads verified
 * safe against the live claude-mem writer).
 *
 * Uses node:sqlite (DatabaseSync) if available on this Node — verified
 * present (experimental) on Node v24.13.0, the WAL journal_mode and the
 * `idx_observations_created ON observations(created_at_epoch DESC)`
 * index both confirmed against a live claude-mem.db. node:sqlite has
 * shipped since Node 22.5 (experimental) — dashboard/package.json's
 * `engines.node >=20` floor predates that, so this module feature-
 * detects via a dynamic import wrapped in try/catch rather than
 * assuming it exists, and returns [] (never throws) when it doesn't.
 *
 * Query: cursors on the existing created_at_epoch DESC index — never a
 * full scan. `merged_into_project IS NULL` excludes rows claude-mem has
 * folded into another observation (they'd otherwise double-count).
 * busy_timeout is set before querying so a concurrent WAL writer never
 * causes a hang. Opened read-only.
 *
 * Privacy: only id/project/type/title/created_at_epoch are selected —
 * never the text/facts/narrative columns, which can carry raw prompt
 * content. Titles are capped the same way other Mission Control
 * surfaces cap free text (mission-control-feed.js's SUBJECT_MAX
 * pattern).
 *
 * Opt-in: most users won't have claude-mem installed — a missing DB
 * file means the panel/endpoint returns [] and the caller hides the
 * panel entirely.
 *
 * Zero new deps, ESM, read-only, fail-open: any error (missing DB,
 * missing node:sqlite, a locked file, a malformed row) yields [], never
 * throws.
 * Core free forever — no license check, no tier gating.
 */
import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HISTORY_CAP = 50;
const TITLE_MAX = 200;
const BUSY_TIMEOUT_MS = 5000;

let sqliteModulePromise;

// Cached across calls in a process — node:sqlite's presence never
// changes at runtime, and re-importing it on every request is wasted
// work (and would repeat the ExperimentalWarning).
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

function truncateTitle(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX)}…` : trimmed;
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
 * Read up to 50 most-recent claude-mem observations newer than `after`
 * (epoch ms, default 0 = everything), mapped to
 * {ts, type, title, project, id}. Missing DB, missing node:sqlite, or
 * any query error → []. Never throws.
 */
async function readHistory({ dbPath, after, now } = {}) {
  void now; // accepted for interface symmetry with the rest of the read model; unused here
  const resolvedPath = dbPath || defaultDbPath();

  if (!(await fileExists(resolvedPath))) return [];

  const sqliteModule = await loadSqliteModule();
  if (!sqliteModule || typeof sqliteModule.DatabaseSync !== 'function') return [];

  const afterEpoch = Number.isFinite(after) ? after : 0;
  let db;
  try {
    db = new sqliteModule.DatabaseSync(resolvedPath, { readOnly: true });
    db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    const rows = db
      .prepare(
        `SELECT id, project, type, title, created_at_epoch FROM observations
         WHERE created_at_epoch > ? AND merged_into_project IS NULL
         ORDER BY created_at_epoch DESC LIMIT ?`
      )
      .all(afterEpoch, HISTORY_CAP);

    return rows
      .map((row) => ({
        id: row.id ?? null,
        ts: Number.isFinite(row.created_at_epoch) ? row.created_at_epoch : null,
        type: typeof row.type === 'string' && row.type ? row.type : 'discovery',
        title: truncateTitle(row.title) || '(untitled)',
        project: typeof row.project === 'string' && row.project ? row.project : null,
      }))
      .filter((row) => row.ts !== null);
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
      // already closed / never opened
    }
  }
}

export { readHistory, defaultDbPath };
