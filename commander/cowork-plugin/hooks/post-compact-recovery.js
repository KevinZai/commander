#!/usr/bin/env node
/**
 * post-compact-recovery.js
 * Hook: SessionStart (remapped from PostCompact — no PostCompact plugin event exists)
 * Restores critical session state after context compaction.
 * Runs on every SessionStart; emits orientation message only when session state
 * files indicate a prior compact occurred. Harmless no-op when state files are absent.
 * Reads ~/.claude/commander/sessions/active-session.json and emits
 * a concise orientation message (stdout → injected as system message).
 * Keep output ≤3 lines to avoid wasting tokens.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSION_FILE = join(CCC_DIR, 'sessions', 'active-session.json');
const STATE_FILE = join(CCC_DIR, 'session-state.json');

/**
 * Pure-function entry for orchestrator (CC-414).
 * Returns the JSON output object instead of writing to stdout.
 */
export async function run({ input = {}, home } = {}) {
  const HOME = home || process.env.HOME;
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
    return {
      continue: true,
      suppressOutput: false,
      status: `CCC: Context compacted — re-orienting. ${sessionInfo}${stateInfo}`,
    };
  } catch {
    return { continue: true };
  }
}

async function main() {
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
    // Attempt to read active session state
    let sessionInfo = '';
    try {
      const session = JSON.parse(await readFile(SESSION_FILE, 'utf8'));
      const cost = session.estimatedCost ? ` | cost so far: $${session.estimatedCost.toFixed(2)}` : '';
      const mode = session.activeMode ? ` | mode: ${session.activeMode}` : '';
      const skill = session.activeSkill ? ` | skill: ${session.activeSkill}` : '';
      sessionInfo = `tier: ${session.tier || 'free'}${cost}${mode}${skill}`;
    } catch {
      // No session file — minimal message
      sessionInfo = 'session state unavailable';
    }

    // Also check session-state.json for active mode/skill/agent
    let stateInfo = '';
    try {
      const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
      const parts = [];
      if (state.activeMode) parts.push(`mode=${state.activeMode}`);
      if (state.lastAgent) parts.push(`lastAgent=${state.lastAgent}`);
      if (state.activeSkill) parts.push(`skill=${state.activeSkill}`);
      if (parts.length) stateInfo = ` [${parts.join(', ')}]`;
    } catch {
      // No state file — skip
    }

    const message = `CCC: Context compacted — re-orienting. ${sessionInfo}${stateInfo}`;

    // PostCompact hook: stdout is injected as a system message
    process.stdout.write(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status: message,
    }) + '\n');
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
