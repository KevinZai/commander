#!/usr/bin/env node
/**
 * pre-compact.js
 * Hook: PreCompact
 *
 * Decides whether to block compaction based on session state.
 *   - blocks if: active task in progress (status: executing / writing / committing)
 *   - allows otherwise: session idle, no active-session.json, or any error (fail open)
 *
 * Free forever — no license check, no tier gating.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');

async function main() {
  try {
    const activeSessionFile = join(CCC_DIR, 'sessions', 'active-session.json');
    let sessionState = {};
    try {
      sessionState = JSON.parse(await readFile(activeSessionFile, 'utf8'));
    } catch {
      // No active session file — allow compaction
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Block compaction if session is in a critical state
    const blockedStates = ['executing', 'writing', 'committing'];
    if (blockedStates.includes(sessionState.status)) {
      process.stdout.write(JSON.stringify({
        continue: false,
        stopReason: `Session is in state "${sessionState.status}" — compaction blocked to preserve context. Wait for task completion or manually trigger compaction.`,
      }) + '\n');
      return;
    }

    // Allow compaction
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // On any error, allow compaction (fail open)
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
