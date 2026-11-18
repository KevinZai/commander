#!/usr/bin/env node
/**
 * session-end.js
 * Hook: SessionEnd
 *
 * Persists session learning to ~/.claude/commander/knowledge/ for
 * compounding intelligence across sessions.
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { readStdinJson, sessionKey } from './lib/session-key.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { readActiveSession, readArchivedSession } from './lib/active-session.mjs';

const CCC_DIR = stateDir();
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const SESSIONS_DIR = join(CCC_DIR, 'sessions');

// session-save runs in parallel on SessionEnd: it archives this session's live
// record as <date>-<h8>.json (h8 derived from the session key) and removes the
// live record. Whichever hook runs first, one of the two files holds this
// session (CC-1360 F14). Both lookups are direct reads of known names: no
// directory listing and no per-archive stat, so a large archive cannot push
// this hook past its 3 s timeout (Codex audit #31). Neither lookup returns
// another session's record (#25).
async function main() {
  try {
    const input = await readStdinJson();
    const key = sessionKey(input);
    const sessionId = key === 'default' ? `session-${Date.now()}` : key;
    const sessionData = (await readActiveSession(SESSIONS_DIR, key)) || (await readArchivedSession(SESSIONS_DIR, key));
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

    track('hook_fired', { hook: 'SessionEnd', handler: 'session-end' });

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
