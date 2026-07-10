#!/usr/bin/env node
/**
 * post-compact-recovery.js
 * Hook: PostCompact (standalone CLI) + SessionStart (via orchestrator run() export)
 *
 * Dual-mode: exports run({input,env,cwd}) for the SessionStart orchestrator,
 * and runs standalone via CLI tail when invoked directly (PostCompact hook).
 *
 * Reads ~/.claude/commander/sessions/active-session.json and session-state.json.
 * Emits an orientation status message so the model knows it returned from
 * context compaction. Always exits 0. Keep output ≤3 lines to avoid wasting tokens.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitBoth } from './lib/emit.mjs';

/**
 * Pure-function entry for orchestrator (CC-414).
 * Returns the JSON output object instead of writing to stdout.
 */
export async function run({ input = {}, env = process.env, cwd = process.cwd() } = {}) {
  const HOME = env.HOME || env.USERPROFILE || '/tmp';
  const cccDir = join(HOME, '.claude', 'commander');
  const sessionFile = join(cccDir, 'sessions', 'active-session.json');
  const stateFile = join(cccDir, 'session-state.json');
  try {
    let sessionInfo = '';
    try {
      const session = JSON.parse(await readFile(sessionFile, 'utf8'));
      const cost = session.estimatedCost ? ` | cost so far: $${session.estimatedCost.toFixed(2)}` : '';
      const mode = session.activeMode ? ` | mode: ${session.activeMode}` : '';
      const skill = session.activeSkill ? ` | skill: ${session.activeSkill}` : '';
      sessionInfo = `tier: ${session.tier || 'free'}${cost}${mode}${skill}`;
    } catch {
      sessionInfo = 'session state unavailable';
    }
    let stateInfo = '';
    try {
      const state = JSON.parse(await readFile(stateFile, 'utf8'));
      const parts = [];
      if (state.activeMode) parts.push(`mode=${state.activeMode}`);
      if (state.lastAgent) parts.push(`lastAgent=${state.lastAgent}`);
      if (state.activeSkill) parts.push(`skill=${state.activeSkill}`);
      if (parts.length) stateInfo = ` [${parts.join(', ')}]`;
    } catch {}
    // Orientation is for the MODEL as much as the user — emit on both channels.
    const hookEventName = input.hook_event_name || 'PostCompact';
    return emitBoth(hookEventName, `CCC: Context compacted — re-orienting. ${sessionInfo}${stateInfo}`);
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
