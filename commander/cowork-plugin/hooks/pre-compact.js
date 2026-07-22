#!/usr/bin/env node
/**
 * pre-compact.js
 * Hook: PreCompact
 *
 * Writes a minimal handoff snapshot BEFORE compaction so the post-compact
 * session (or a fresh one) can re-orient:
 *   ~/.claude/commander/handoff-<session>.json
 *   { ts, sessionId, cwd, branch, todos, projectState, toolCalls }
 *
 * Never blocks compaction. Always exits 0 (fail open). The old blocked-states
 * check (executing/writing/committing) was unreachable — no code ever wrote
 * those states — and has been removed.
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
// project-state.json / last-suggestion.json moved to per-project dirs in the
// v7.3.0 suggest migration — reuse the writer's own slug/path helpers so this
// reader can never drift from where suggest-ticker.js actually writes.
import { resolveCwd, projectDir } from './suggest-ticker.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSION_KEY = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';

function gitBranch(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

async function readJsonSafe(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

async function main() {
  try {
    track('hook_fired', { hook: 'PreCompact', handler: 'pre-compact' });

    // The PreCompact payload carries the session's cwd — prefer it over
    // process.cwd() so the snapshot and per-project reads key to the right
    // project. Tolerant read: any stdin failure degrades to process.cwd().
    let payload = {};
    try {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw) payload = JSON.parse(raw);
    } catch {}
    const cwd = resolveCwd(payload);

    // Gather cheap, local state — every piece is optional.
    const branch = gitBranch(cwd);

    let todos = [];
    try {
      const raw = await readFile(join(cwd, 'tasks', 'todo.md'), 'utf8');
      todos = raw.split('\n').filter(l => l.trim()).slice(0, 10);
    } catch {}

    const projectState = await readJsonSafe(join(projectDir(cwd), 'project-state.json'));
    const costData = await readJsonSafe(join(CCC_DIR, 'sessions', `active-cost-${SESSION_KEY}.json`));
    const lastSuggestion = await readJsonSafe(join(projectDir(cwd), 'last-suggestion.json'));

    const snapshot = {
      ts: new Date().toISOString(),
      sessionId: SESSION_KEY,
      cwd,
      branch,
      todos,
      toolCalls: costData?.toolCalls ?? 0,
      projectState: projectState ? {
        branch: projectState.branch,
        aheadMain: projectState.aheadMain,
        behindMain: projectState.behindMain,
        stack: projectState.stack,
        testsStatus: projectState.testsStatus,
        ciStatus: projectState.ciStatus,
        openTodos: projectState.openTodos,
      } : null,
      lastSuggestion: lastSuggestion?.suggestions ?? null,
    };

    const handoffFile = join(CCC_DIR, `handoff-${SESSION_KEY}.json`);
    await mkdir(CCC_DIR, { recursive: true });
    await writeFile(handoffFile, JSON.stringify(snapshot, null, 2));

    process.stdout.write(JSON.stringify(emitUser(
      `📦 CCC handoff snapshot written: ${handoffFile} (branch ${branch || '?'}, ${todos.length} todo lines)`
    )) + '\n');
  } catch {
    // On any error, allow compaction (fail open)
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
