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
 * Free for now — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSION_KEY = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';

function gitBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'],
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

    // Gather cheap, local state — every piece is optional.
    const branch = gitBranch();

    let todos = [];
    try {
      const raw = await readFile(join(process.cwd(), 'tasks', 'todo.md'), 'utf8');
      todos = raw.split('\n').filter(l => l.trim()).slice(0, 10);
    } catch {}

    const projectState = await readJsonSafe(join(CCC_DIR, 'project-state.json'));
    const costData = await readJsonSafe(join(CCC_DIR, 'sessions', `active-cost-${SESSION_KEY}.json`));
    const lastSuggestion = await readJsonSafe(join(CCC_DIR, 'last-suggestion.json'));

    const snapshot = {
      ts: new Date().toISOString(),
      sessionId: SESSION_KEY,
      cwd: process.cwd(),
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
