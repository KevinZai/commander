/**
 * atomic-json.mjs — read-modify-write of a small JSON state file, safe across processes.
 *
 * Parallel tool calls run PreToolUse hooks concurrently (and Code Mode issues many calls from one piece of code),
 * so two processes can read the same counter, both add one and the second write loses the first increment
 * (Codex audit #26). updateJson() takes an exclusive lock file (`<file>.lock`, created with O_EXCL), reads,
 * applies `mutate`, writes a temp file and renames it over the target, then releases the lock.
 *
 * Lock policy: wait up to `waitMs` (default 400 ms, polled every few ms). A lock holds "<pid>:<token>"; it is broken when
 * that process is gone, or when it is older than `staleMs` (default 30 s, well past any hook's timeout, so a
 * live writer's lock is never taken). Release removes the lock only while it still holds this writer's token. When the lock still can't be had
 * the update proceeds unlocked (hooks must not stall the tool call, and the temp-file rename still guarantees no
 * reader ever sees a torn file), unless `requireLock` is set, which throws instead. The result says which
 * happened (`locked: true|false`). With `strict`, only a missing file starts from `fallback()`; a file that is
 * unreadable or not a JSON object throws instead of being reset.
 */
import { open, readFile, writeFile, rename, unlink, stat, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquire(lockFile, { waitMs, staleMs }) {
  const deadline = Date.now() + waitMs;
  const token = `${process.pid}:${randomBytes(8).toString('hex')}`;
  for (;;) {
    try {
      const fh = await open(lockFile, 'wx');
      try { await fh.writeFile(token); } finally { await fh.close(); }
      return token;
    } catch (err) {
      if (err && err.code !== 'EEXIST') return false;
    }
    try {
      const st = await stat(lockFile);
      if (Date.now() - st.mtimeMs > staleMs || await ownerGone(lockFile)) {
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

/** The lock's writer (a pid other than ours) no longer runs. */
async function ownerGone(lockFile) {
  let pid;
  try { pid = Number(String(await readFile(lockFile, 'utf8')).trim().split(':')[0]); } catch { return false; }
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try { process.kill(pid, 0); return false; } catch (err) { return err?.code === 'ESRCH'; }
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
/** Remove the lock only while it is still ours (another writer may have broken and retaken it). */
async function release(lockFile, token) {
  try { if (String(await readFile(lockFile, 'utf8')) === token) await unlink(lockFile); } catch {}
}

export async function updateJson(file, mutate, { fallback = () => ({}), waitMs = 400, staleMs = 30000, strict = false, requireLock = false } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const lockFile = `${file}.lock`;
  const token = await acquire(lockFile, { waitMs, staleMs });
  const locked = token !== false;
  if (requireLock && !locked) throw new Error(`could not lock ${file}`);
  try {
    let current;
    try {
      current = JSON.parse(await readFile(file, 'utf8'));
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        if (strict) throw new Error(`${file} is not a JSON object`);
        current = fallback();
      }
    } catch (err) {
      if (strict && err?.code !== 'ENOENT') throw err;
      current = fallback();
    }
    const next = await mutate(current);
    if (next === undefined) return { value: current, written: false, locked };
    await writeJsonAtomic(file, next);
    return { value: next, written: true, locked };
  } finally {
    if (locked) await release(lockFile, token);
  }
}
