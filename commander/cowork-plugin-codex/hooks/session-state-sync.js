#!/usr/bin/env node
/**
 * session-state-sync.js
 * Hooks: CwdChanged + DirectoryAdded
 *
 * Keeps ~/.claude/commander/sessions/active-session.json (seeded by the
 * SessionStart orchestrator, read by context-warning.js, post-compact-recovery.js,
 * session-save.js and session-end.js) current:
 *   CwdChanged     -> cwd = new_cwd, previousCwd = old_cwd, cwdChangedAt
 *   DirectoryAdded -> directories[] gains { path, source, addedAt } (deduped, capped)
 *
 * Prints nothing (both events are side-effect only) and always exits 0.
 * Writes atomically (tmp + rename) and only under ~/.claude/commander/.
 */
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const MAX_DIRECTORIES = 50;
const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);
const absPath = (v) => (typeof v === 'string' && isAbsolute(v) ? v.slice(0, 1024) : null);

async function main() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  let input = {};
  try { if (raw) input = JSON.parse(raw) || {}; } catch { input = {}; }
  if (typeof input !== 'object') return;
  const event = input.hook_event_name;
  if (event !== 'CwdChanged' && event !== 'DirectoryAdded') return;

  const dir = join(stateDir(), 'sessions');
  const file = join(dir, 'active-session.json');
  let state = {};
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state = parsed;
  } catch {
    state = { status: 'active' };
  }
  const now = new Date().toISOString();

  if (event === 'CwdChanged') {
    const next = absPath(input.new_cwd) || absPath(input.cwd);
    if (!next) return;
    const prev = absPath(input.old_cwd);
    state = { ...state, cwd: next, cwdChangedAt: now };
    if (prev) state.previousCwd = prev;
  } else {
    const added = absPath(input.directory);
    if (!added) return;
    const existing = Array.isArray(state.directories) ? state.directories : [];
    const kept = existing.filter((d) => d && d.path !== added);
    kept.push({ path: added, source: clip(input.source, 32) || null, addedAt: now });
    state = { ...state, directories: kept.slice(-MAX_DIRECTORIES) };
  }

  await mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, file);
}

setTimeout(() => process.exit(0), 4000).unref();
main().catch(() => {}).finally(() => { process.exitCode = 0; });
