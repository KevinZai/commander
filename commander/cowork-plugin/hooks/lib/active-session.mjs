/**
 * active-session.mjs — where one session's live record and its SessionEnd archive live.
 *
 * Every session used to share `sessions/active-session.json`, so with two sessions open the second
 * SessionStart overwrote the first's record and the first SessionEnd archived (and deleted) the second's
 * (Codex audit #25). Records are now keyed by the stdin session_id (hooks/lib/session-key.mjs):
 *
 *   sessions/active-session-<key>.json   live record, carries sessionId = key
 *   sessions/<YYYY-MM-DD>-<h8>.json       archive, h8 = first 8 hex of sha256(key); carries sessionId
 *
 * The archive name is derived from the key, so session-end finds this session's archive with at most
 * two reads (today and yesterday, UTC) instead of stat-ing every archive (Codex audit #31).
 * The legacy shared file is used only when no session id is known at all (key 'default').
 * Ownership rule for cleanup: delete a record only when its sessionId is this session's key.
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readFile, readdir, stat, unlink } from 'node:fs/promises';

export const LEGACY_ACTIVE_FILE = 'active-session.json';
const ACTIVE_PREFIX = 'active-session-';

/** Path of this session's live record. */
export function activeSessionFile(sessionsDir, key) {
  return key && key !== 'default'
    ? join(sessionsDir, `${ACTIVE_PREFIX}${key}.json`)
    : join(sessionsDir, LEGACY_ACTIVE_FILE);
}

/** 8 hex chars identifying a session key in archive file names. */
export function archiveTag(key) {
  return createHash('sha256').update(String(key)).digest('hex').slice(0, 8);
}

/** Archive file name for `key` on the UTC day of `date`. */
export function archiveName(key, date = new Date()) {
  return `${date.toISOString().slice(0, 10)}-${archiveTag(key)}.json`;
}

async function readJson(file) {
  try {
    const v = JSON.parse(await readFile(file, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * This session's live record, or null. A keyed record must carry the same sessionId (or none, for records
 * written by an older hook build); the legacy shared file is read only for key 'default'.
 */
export async function readActiveSession(sessionsDir, key) {
  const data = await readJson(activeSessionFile(sessionsDir, key));
  if (!data) return null;
  if (key && key !== 'default' && data.sessionId && data.sessionId !== key) return null;
  return data;
}

/** Delete this session's live record, only when it is ours. Returns true when a file was removed. */
export async function removeActiveSession(sessionsDir, key) {
  const file = activeSessionFile(sessionsDir, key);
  const data = await readJson(file);
  if (key && key !== 'default' && data && data.sessionId && data.sessionId !== key) return false;
  try {
    await unlink(file);
    return true;
  } catch {
    return false;
  }
}

/** This session's archive written by session-save (today or yesterday, UTC), or null. Never another session's. */
export async function readArchivedSession(sessionsDir, key, now = new Date()) {
  if (!key || key === 'default') return null;
  const days = [now, new Date(now.getTime() - 24 * 60 * 60 * 1000)];
  for (const day of days) {
    const data = await readJson(join(sessionsDir, archiveName(key, day)));
    if (data && data.sessionId === key) return data;
  }
  return null;
}

/**
 * Remove keyed live records untouched for `maxAgeMs` (default 7 days): sessions that crashed before SessionEnd.
 * Only `active-session-*.json` files are considered, and `skipKey`'s own record is never touched.
 */
export async function pruneStaleActiveSessions(sessionsDir, { maxAgeMs = 7 * 24 * 60 * 60 * 1000, skipKey, now = Date.now(), limit = 200 } = {}) {
  let names;
  try { names = await readdir(sessionsDir); } catch { return 0; }
  let removed = 0;
  let checked = 0;
  for (const name of names) {
    if (!name.startsWith(ACTIVE_PREFIX) || !name.endsWith('.json')) continue;
    if (skipKey && name === `${ACTIVE_PREFIX}${skipKey}.json`) continue;
    if (++checked > limit) break;
    try {
      const st = await stat(join(sessionsDir, name));
      if (now - st.mtimeMs > maxAgeMs) {
        await unlink(join(sessionsDir, name));
        removed++;
      }
    } catch {}
  }
  return removed;
}
