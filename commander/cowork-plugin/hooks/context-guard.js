#!/usr/bin/env node
/**
 * context-guard.js
 * Hook: UserPromptSubmit
 *
 * Proactively warns at context usage thresholds with idempotent state tracking.
 * Thresholds (% USED): 70% → gentle nudge, 85% → strong warning, 95% → auto-save.
 *
 * Env vars:
 *   CC_CONTEXT_GUARD_DISABLE=1  — disables all nudges
 *   CC_CONTEXT_GUARD_THRESHOLD=N — override warn threshold (default 70)
 *
 * Context % detection: reads CLAUDE_CONTEXT_USED_PCT or CLAUDE_CONTEXT_PERCENT.
 * If neither is set, the hook no-ops silently (context metric unavailable).
 *
 * State tracking: ~/.claude/commander/state.json (thresholds fired per session)
 * At 95%: writes auto-save snapshot to ~/.claude/sessions/auto-YYYY-MM-DD-HHMM.tmp
 */
import { track } from '../lib/telemetry.js';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const CCC_DIR = join(HOME, '.claude', 'commander');
const STATE_FILE = join(CCC_DIR, 'state.json');
const SESSIONS_DIR = join(HOME, '.claude', 'sessions');

const THRESHOLDS = [
  {
    pct: 95,
    key: 'context_95',
    label: '🔴 Context at 95%',
    msg: 'Auto-save firing — state written to ~/.claude/sessions/ for /resume-session.',
    autoSave: true,
  },
  {
    pct: 85,
    key: 'context_85',
    label: '⚠️ Context at 85%',
    msg: 'Strongly recommend /save-session now — another long task may compact mid-flight.',
    autoSave: false,
  },
  {
    pct: 70,
    key: 'context_70',
    label: '📊 Context at 70%',
    msg: 'Run /save-session if you want a clean handoff later.',
    autoSave: false,
  },
];

async function readState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
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
    note: 'Auto-saved by context-guard at 95% threshold. Use /resume-session to reload.',
  };
  await writeFile(fname, JSON.stringify(payload, null, 2));
  return fname;
}

async function main() {
  // Disable check
  if (process.env.CC_CONTEXT_GUARD_DISABLE === '1') {
      track('hook_fired', { hook: 'PreToolUse', handler: 'context-guard' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  // Parse stdin (hook input)
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    // We don't need stdin content — just drain it
  } catch {
    // Ignore
  }

  try {
    // Detect context % used
    const rawPct =
      process.env.CLAUDE_CONTEXT_USED_PCT ||
      process.env.CLAUDE_CONTEXT_PERCENT ||
      '';

    if (!rawPct || rawPct === '0') {
      // Context metric unavailable — no-op silently
      // NOTE: hook is dormant until Claude Code exposes this env var.
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const usedPct = parseFloat(rawPct);
    if (isNaN(usedPct) || usedPct <= 0) {
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
      // Check custom threshold
      if (customWarnThreshold > 0 && usedPct >= customWarnThreshold) {
        process.stdout.write(
          JSON.stringify({
            continue: true,
            suppressOutput: false,
            status: `📊 Context at ${usedPct.toFixed(0)}% (custom threshold ${customWarnThreshold}%) — consider /save-session`,
          }) + '\n'
        );
      } else {
        process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      }
      return;
    }

    // Read idempotency state
    const state = await readState();
    const sessionId = process.env.CLAUDE_SESSION_ID || 'default';
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
        statusMsg += ' [Auto-save failed — run /save-session manually]';
      }
    }

    process.stdout.write(
      JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: statusMsg,
      }) + '\n'
    );
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
