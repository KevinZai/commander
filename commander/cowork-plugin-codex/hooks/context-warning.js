#!/usr/bin/env node
/**
 * context-warning.js
 * Hook: UserPromptSubmit
 * Proactively warns at context thresholds: 30% / 15% / 10% / 5% remaining.
 * Respects CC_COACH_DISABLE=1 env var.
 * Emits structured status for Claude to surface — never blocks.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSION_FILE = join(CCC_DIR, 'sessions', 'active-session.json');

// Context thresholds (% remaining) with urgency levels
const THRESHOLDS = [
  { pct: 5,  label: '🔴 CRITICAL', msg: 'Only 5% context left — save session now with /save-session' },
  { pct: 10, label: '🟠 WARNING',  msg: '10% context remaining — wrap up or compact soon' },
  { pct: 15, label: '🟡 NOTICE',   msg: '15% context remaining — consider /compact before the next big task' },
  { pct: 30, label: '💡 INFO',     msg: '30% context remaining — good time to /save-session' },
];

async function main() {
  // Respect disable flag
  if (process.env.CC_COACH_DISABLE === '1') {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    // Context usage comes from env vars Claude Code may set, or from session file
    const contextUsedPct = parseFloat(
      process.env.CLAUDE_CONTEXT_USED_PCT
      || process.env.CLAUDE_CONTEXT_PERCENT
      || '0'
    );

    // Also check session file for stored context info
    let storedPct = 0;
    try {
      const session = JSON.parse(await readFile(SESSION_FILE, 'utf8'));
      storedPct = session.contextUsedPct || 0;
    } catch {
      // No session file
    }

    const usedPct = contextUsedPct || storedPct;
    if (usedPct <= 0) {
      // No context info available — pass through silently
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const remainingPct = 100 - usedPct;

    // Find the most urgent threshold that applies
    const match = THRESHOLDS.find(t => remainingPct <= t.pct);
    if (!match) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status: `${match.label}: ${match.msg} (${remainingPct.toFixed(0)}% remaining)`,
    }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
