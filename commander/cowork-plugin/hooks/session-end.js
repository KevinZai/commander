#!/usr/bin/env node
/**
 * session-end.js
 * Hook: SessionEnd (maps to Stop event)
 *
 * Persists session learning to ~/.claude/commander/knowledge/ for
 * compounding intelligence across sessions.
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { readStdinJson, sessionKey } from './lib/session-key.mjs';
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const CCC_DIR = stateDir();
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const SESSIONS_DIR = join(CCC_DIR, 'sessions');
const ARCHIVE_SCAN_LIMIT = 50;

// session-save runs in parallel on SessionEnd and unlinks active-session.json
// after archiving it as <date>-<hex>.json with sessionId set. Whichever hook
// runs first, one of the two files holds this session (CC-1360 F14).
async function readArchivedSession(key) {
  if (!key || key === 'default') return null;
  let names;
  try { names = await readdir(SESSIONS_DIR); } catch { return null; }
  // Newest first by mtime: the hex suffix is random, so names do not sort by
  // recency within a day.
  const candidates = [];
  for (const name of names) {
    if (!/^\d{4}-\d{2}-\d{2}-[0-9a-f]+\.json$/.test(name)) continue;
    try { candidates.push({ name, mtime: (await stat(join(SESSIONS_DIR, name))).mtimeMs }); } catch {}
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  for (const { name } of candidates.slice(0, ARCHIVE_SCAN_LIMIT)) {
    try {
      const data = JSON.parse(await readFile(join(SESSIONS_DIR, name), 'utf8'));
      if (data && data.sessionId === key) return data;
    } catch {}
  }
  return null;
}

async function main() {
  try {
    const input = await readStdinJson();
    const key = sessionKey(input);
    const sessionId = key === 'default' ? `session-${Date.now()}` : key;
    const activeSessionFile = join(SESSIONS_DIR, 'active-session.json');

    let sessionData = null;
    try {
      sessionData = JSON.parse(await readFile(activeSessionFile, 'utf8'));
    } catch {
      sessionData = await readArchivedSession(key);
    }
    if (!sessionData) {
      // No session data — nothing to persist
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    // Write session summary to knowledge directory
    await mkdir(KNOWLEDGE_DIR, { recursive: true });
    const summary = {
      sessionId,
      endedAt: new Date().toISOString(),
      startedAt: sessionData.startedAt,
      // Future: add task completions, patterns learned, corrections made
    };
    await writeFile(
      join(KNOWLEDGE_DIR, `session-${sessionId}.json`),
      JSON.stringify(summary, null, 2)
    );

    track('hook_fired', { hook: 'Stop', handler: 'session-end' });

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
