#!/usr/bin/env node
/**
 * context-guard.js
 * Hook: UserPromptSubmit
 *
 * The one CCC context-budget hook (context-warning.js was folded in, CC-1357).
 * Warns once per tier per session; the tiers re-arm after usage drops below
 * 70% (for example after /compact).
 * Thresholds (% USED): 70% → write the handoff doc, 85% → hand off now,
 * 90% → finish the step and hand off, 95% → auto-save.
 *
 * Env vars:
 *   CC_CONTEXT_GUARD_DISABLE=1  — disables all nudges
 *   CC_CONTEXT_GUARD_THRESHOLD=N — override warn threshold (default 70)
 *
 * Context % detection: transcript JSONL estimate (lib/context-estimate.mjs) —
 * env vars CLAUDE_CONTEXT_USED_PCT / CLAUDE_CONTEXT_PERCENT win when set.
 * If no signal is available, the hook no-ops silently.
 *
 * State tracking: ~/.claude/commander/state.json (thresholds fired per session)
 * At 95%: writes auto-save snapshot to ~/.claude/sessions/auto-YYYY-MM-DD-HHMM.tmp
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { sessionKey } from './lib/session-key.mjs';
import { estimateContextPct } from './lib/context-estimate.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readablePath, stateDir } from '../lib/lane-state.js';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const CCC_DIR = stateDir();
const STATE_FILE = join(CCC_DIR, 'state.json');
const SESSIONS_DIR = join(HOME, '.claude', 'sessions');

const THRESHOLDS = [
  {
    pct: 95,
    key: 'context_95',
    label: '🔴 Context at 95%',
    msg: 'Auto-save firing — state written to ~/.claude/sessions/ for /ccc-resume-session.',
    autoSave: true,
  },
  {
    pct: 90,
    key: 'context_90',
    label: '🟠 Context at 90%',
    msg: 'Finish the current step, then /ccc-handoff and continue in a new chat.',
    autoSave: false,
  },
  {
    pct: 85,
    key: 'context_85',
    label: '⚠️ Context at 85%',
    msg: 'Hand off now: /ccc-handoff (or /ccc-save-session) — another long task may compact mid-flight.',
    autoSave: false,
  },
  {
    pct: 70,
    key: 'context_70',
    label: '📊 Context at 70%',
    msg: 'Good time to write the handoff doc with /ccc-handoff while what worked, what failed and the next step are fresh.',
    autoSave: false,
  },
];

async function readState() {
  try {
    // state.json also holds the user's CCC state: read the legacy copy until the lane has its own.
    const raw = await readFile(readablePath('state.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeState(state) {
  await mkdir(CCC_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function writeAutoSave(usedPct, sessionId) {
  await mkdir(SESSIONS_DIR, { recursive: true });
  const now = new Date();
  const stamp =
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
  const fname = join(SESSIONS_DIR, `auto-${stamp}.tmp`);
  const payload = {
    ts: now.toISOString(),
    sessionId: sessionId || 'unknown',
    contextUsedPct: usedPct,
    note: 'Auto-saved by context-guard at 95% threshold. Use /ccc-resume-session to reload.',
  };
  await writeFile(fname, JSON.stringify(payload, null, 2));
  return fname;
}

async function main() {
  track('hook_fired', { hook: 'UserPromptSubmit', handler: 'context-guard' });
  // Disable check
  if (process.env.CC_CONTEXT_GUARD_DISABLE === '1') {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  // Parse stdin (hook input) — we need transcript_path for the estimate
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    // Ignore — estimate falls back to env vars only
  }

  try {
    // Detect context % used: transcript JSONL heuristic (env vars win if set)
    const transcriptPath = input.transcript_path || input.transcriptPath || '';
    const usedPct = estimateContextPct(transcriptPath);

    if (!usedPct || isNaN(usedPct) || usedPct <= 0) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Custom threshold override
    const customWarnThreshold = parseInt(
      process.env.CC_CONTEXT_GUARD_THRESHOLD || '0',
      10
    );

    // Find the highest threshold that has been crossed (most urgent first)
    const fired = [];
    for (const t of THRESHOLDS) {
      if (usedPct >= t.pct) {
        fired.push(t);
      }
    }

    if (fired.length === 0) {
      // Below every tier (e.g. after /compact): re-arm this session's tiers.
      const state = await readState();
      const sessionId = sessionKey(input);
      if (state[sessionId] && THRESHOLDS.some((t) => state[sessionId][t.key])) {
        for (const t of THRESHOLDS) delete state[sessionId][t.key];
        await writeState(state);
      }
      // Check custom threshold
      if (customWarnThreshold > 0 && usedPct >= customWarnThreshold) {
        process.stdout.write(
          JSON.stringify(
            emitUser(`📊 Context at ${usedPct.toFixed(0)}% (custom threshold ${customWarnThreshold}%) — consider /ccc-handoff`)
          ) + '\n'
        );
      } else {
        process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      }
      return;
    }

    // Read idempotency state
    const state = await readState();
    const sessionId = sessionKey(input);
    const sessionState = state[sessionId] || {};

    // Pick the most urgent unfired threshold
    let match = null;
    for (const t of fired) {
      if (!sessionState[t.key]) {
        match = t;
        break;
      }
    }

    if (!match) {
      // All applicable thresholds already fired — no-op
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Mark as fired
    sessionState[match.key] = true;
    state[sessionId] = sessionState;
    await writeState(state);

    let statusMsg = `${match.label} — ${match.msg}`;

    // Auto-save at 95%
    if (match.autoSave) {
      try {
        const savedPath = await writeAutoSave(usedPct, sessionId);
        statusMsg += ` [Saved: ${savedPath}]`;
      } catch {
        statusMsg += ' [Auto-save failed — run /ccc-save-session manually]';
      }
    }

    process.stdout.write(JSON.stringify(emitUser(statusMsg)) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
