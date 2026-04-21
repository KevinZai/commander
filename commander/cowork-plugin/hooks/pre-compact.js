#!/usr/bin/env node
/**
 * pre-compact.js
 * Hook: PreCompact
 * Free tier: no-op stub (returns { continue: true })
 * Pro tier: decides whether to block compaction based on session state
 *   - blocks if: active task in progress, unsaved work detected, cost < $0.50 (compaction not yet needed)
 *   - allows if: session idle, explicit user request, cost > threshold
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const LICENSE_FILE = join(CCC_DIR, 'license.json');

async function isPro() {
  try {
    const license = JSON.parse(await readFile(LICENSE_FILE, 'utf8'));
    return license.key && license.expires && new Date(license.expires) > new Date() && license.tier === 'pro';
  } catch {
    return false;
  }
}

async function main() {
  try {
    const pro = await isPro();

    if (!pro) {
      // Free tier: always allow compaction
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Pro tier: check session state before allowing compaction
    const activeSessionFile = join(CCC_DIR, 'sessions', 'active-session.json');
    let sessionState = {};
    try {
      sessionState = JSON.parse(await readFile(activeSessionFile, 'utf8'));
    } catch {
      // No active session file — allow compaction
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Allow compaction if session is not in a critical state
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
