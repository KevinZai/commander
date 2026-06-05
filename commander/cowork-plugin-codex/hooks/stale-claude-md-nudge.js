#!/usr/bin/env node
/**
 * stale-claude-md-nudge.js
 * Hook: InstructionsLoaded (standalone CLI) + SessionStart (via orchestrator run() export)
 *
 * Dual-mode: exports run({input,env,cwd}) for the SessionStart orchestrator,
 * and runs standalone via CLI tail when invoked directly (InstructionsLoaded hook).
 *
 * Checks CLAUDE.md mtime in cwd. If >30 days old, emits a nudge status.
 * Respects CC_NUDGE_DISABLE=1. Always exits 0.
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

// CLI tail — only runs when invoked directly, NOT on import (critical: prevents
// stdin hang when the orchestrator dynamically imports this module).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const chunks = []; for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    let input = {}; try { if (raw) input = JSON.parse(raw); } catch {}
    let res; try { res = await run({ input, env: process.env, cwd: process.cwd() }); }
    catch { res = { continue: true, suppressOutput: true }; }
    process.stdout.write(JSON.stringify(res || { continue: true }) + '\n');
  })();
}
