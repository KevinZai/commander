#!/usr/bin/env node
/**
 * session-save.js
 * Hook: SessionEnd (runs in parallel with session-end.js)
 *
 * Archives THIS session's live record (sessions/active-session-<key>.json) as
 * sessions/<date>-<h8>.json with the tool-call count, then removes the live
 * record and the session's cost counter. Records are keyed by the stdin
 * session_id, and cleanup touches only files that belong to this session
 * (hooks/lib/active-session.mjs, Codex audit #25).
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { readStdinJson, sessionKey } from './lib/session-key.mjs';
import { readFile, mkdir, unlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeJsonAtomic } from './lib/atomic-json.mjs';
import { archiveName, readActiveSession, removeActiveSession } from './lib/active-session.mjs';

const SESSIONS_DIR = join(stateDir(), 'sessions');

async function readOwnedJson(file, key) {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'));
    if (data && typeof data === 'object' && (!data.sessionId || data.sessionId === key)) return data;
  } catch {}
  return null;
}

async function main() {
  try {
    // Session-keyed tool-call budget file (see cost-tracker.js)
    const key = sessionKey(await readStdinJson());
    const COST_FILE = join(SESSIONS_DIR, `active-cost-${key}.json`);
    await mkdir(SESSIONS_DIR, { recursive: true });

    const session = (await readActiveSession(SESSIONS_DIR, key)) || {};
    const costData = { toolCalls: 0, estimatedCost: 0, ...((await readOwnedJson(COST_FILE, key)) || {}) };

    const now = new Date();
    // The archive name is derived from the session key so session-end can find
    // it without listing the directory (#31). A name already taken by another
    // session (an 8-hex collision) falls back to a random suffix.
    const randomName = () => `${now.toISOString().slice(0, 10)}-${randomBytes(4).toString('hex')}.json`;
    let filename = key === 'default' ? randomName() : archiveName(key, now);
    if (key !== 'default' && existsSync(join(SESSIONS_DIR, filename))) {
      const earlier = await readOwnedJson(join(SESSIONS_DIR, filename), key);
      if (!earlier) {
        filename = randomName();
      } else {
        // The same session ended before today (a resumed session): keep that completion under its own
        // name, so the canonical name points at the latest one and no archive is overwritten.
        const stamp = Date.parse(earlier.completedAt) || now.getTime() - 1;
        let kept = filename.replace(/\.json$/, `-${stamp}.json`);
        if (existsSync(join(SESSIONS_DIR, kept))) kept = filename.replace(/\.json$/, `-${stamp}-${randomBytes(4).toString('hex')}.json`);
        await rename(join(SESSIONS_DIR, filename), join(SESSIONS_DIR, kept));
      }
    }

    // sessionId lets session-end (same SessionEnd event, run in parallel) find
    // this archive after the live record is gone (CC-1360 F14).
    const summary = {
      ...session,
      sessionId: key,
      status: 'complete',
      completedAt: now.toISOString(),
      toolCalls: costData.toolCalls,
      estimatedCost: costData.estimatedCost,
    };
    track('hook_fired', { hook: 'SessionEnd', handler: 'session-save' });
    // Temp file + rename: session-end, running in parallel, never reads a half-written archive.
    await writeJsonAtomic(join(SESSIONS_DIR, filename), summary);

    await removeActiveSession(SESSIONS_DIR, key);
    try { await unlink(COST_FILE); } catch {}

    console.log(JSON.stringify(emitUser(
      `CCC session saved: ${filename} (${costData.toolCalls} tool calls, budget unit ~$${Number(costData.estimatedCost || 0).toFixed(2)})`
    )));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
