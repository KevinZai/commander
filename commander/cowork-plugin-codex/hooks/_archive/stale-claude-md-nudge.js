#!/usr/bin/env node
/**
 * stale-claude-md-nudge.js
 * Hook: SessionStart
 * Checks if project CLAUDE.md is older than 30 days.
 * Emits a one-liner nudge if stale. Respects CC_NUDGE_DISABLE=1.
 * Never blocks — no-op on any failure.
 */
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Pure-function entry for orchestrator (CC-414).
 * Accepts pre-parsed stdin via opts.input (orchestrator parses once and forwards).
 * Returns the JSON output object instead of writing to stdout.
 */
export async function run({ input = {}, env = process.env, cwd = process.cwd() } = {}) {
  if (env.CC_NUDGE_DISABLE === '1') return { continue: true };
  try {
    const claudeMdPath = join(cwd, 'CLAUDE.md');
    let fileStat;
    try {
      fileStat = await stat(claudeMdPath);
    } catch {
      return { continue: true };
    }
    const ageMs = Date.now() - fileStat.mtimeMs;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    if (ageMs > STALE_MS) {
      return {
        continue: true,
        suppressOutput: false,
        status: `💡 CLAUDE.md stale (${ageDays}d old) — run /ccc:init to refresh with latest CCC template sections`,
      };
    }
    return { continue: true };
  } catch {
    return { continue: true };
  }
}

async function main() {
  if (process.env.CC_NUDGE_DISABLE === '1') {
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
    // Check for CLAUDE.md in cwd (project root)
    const claudeMdPath = join(process.cwd(), 'CLAUDE.md');

    let fileStat;
    try {
      fileStat = await stat(claudeMdPath);
    } catch {
      // No CLAUDE.md in project — no nudge needed
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const ageMs = Date.now() - fileStat.mtimeMs;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    if (ageMs > STALE_MS) {
      process.stdout.write(JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: `💡 CLAUDE.md stale (${ageDays}d old) — run /ccc:init to refresh with latest CCC template sections`,
      }) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

const __isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (__isMain) main();
