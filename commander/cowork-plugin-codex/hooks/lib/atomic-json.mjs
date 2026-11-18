/**
 * atomic-json.mjs — read-modify-write of a small JSON state file, safe across processes.
 *
 * Parallel tool calls run PreToolUse hooks concurrently (and Code Mode issues many calls from one piece of code),
 * so two processes can read the same counter, both add one and the second write loses the first increment
 * (Codex audit #26). updateJson() takes an exclusive lock file (`<file>.lock`, created with O_EXCL), reads,
 * applies `mutate`, writes a temp file and renames it over the target, then releases the lock.
 *
 * Lock policy: wait up to `waitMs` (default 400 ms, polled every few ms); a lock older than `staleMs` (default 5 s)
 * belongs to a crashed process and is broken. When the lock still can't be had the update proceeds unlocked:
 * hooks must not stall the tool call, and the temp-file rename still guarantees no reader ever sees a torn file.
 * The result says which happened (`locked: true|false`).
 */
import { open, readFile, writeFile, rename, unlink, stat, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquire(lockFile, { waitMs, staleMs }) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      const fh = await open(lockFile, 'wx');
      await fh.writeFile(String(process.pid));
      await fh.close();
      return true;
    } catch (err) {
      if (err && err.code !== 'EEXIST') return false;
    }
    try {
      const st = await stat(lockFile);
      if (Date.now() - st.mtimeMs > staleMs) {
        await unlink(lockFile).catch(() => {});
        continue;
      }
    } catch {
      continue; // released between our open and stat
    }
    if (Date.now() >= deadline) return false;
    await sleep(3 + Math.floor(Math.random() * 5));
  }
}

/** Write JSON through a unique temp file and rename, so a concurrent reader sees the old or the new file, never half. */
export async function writeJsonAtomic(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(value, null, 2));
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Locked read-modify-write. `mutate(current)` receives the parsed object (or `fallback()` when the file is
 * missing or unreadable) and returns the next value, or `undefined` to leave the file untouched.
 * Returns { value, written, locked }.
 */
export async function updateJson(file, mutate, { fallback = () => ({}), waitMs = 400, staleMs = 5000 } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const lockFile = `${file}.lock`;
  const locked = await acquire(lockFile, { waitMs, staleMs });
  try {
    let current;
    try {
      current = JSON.parse(await readFile(file, 'utf8'));
      if (!current || typeof current !== 'object' || Array.isArray(current)) current = fallback();
    } catch {
      current = fallback();
    }
    const next = await mutate(current);
    if (next === undefined) return { value: current, written: false, locked };
    await writeJsonAtomic(file, next);
    return { value: next, written: true, locked };
  } finally {
    if (locked) await unlink(lockFile).catch(() => {});
  }
}
