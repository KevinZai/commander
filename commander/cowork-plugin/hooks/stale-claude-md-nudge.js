#!/usr/bin/env node
/**
 * stale-claude-md-nudge.js
 * Hook: InstructionsLoaded (standalone CLI) + SessionStart (via orchestrator run() export)
 *
 * Dual-mode: exports run({input,env,cwd}) for the SessionStart orchestrator,
 * and runs standalone via CLI tail when invoked directly (InstructionsLoaded hook).
 *
 * Two branches:
 *   1. Missing CLAUDE.md in a git repo that clearly contains code →
 *      nudge to run /ccc-adopt (which asks before writing anything).
 *      Once per project per day (marker in ~/.claude/commander/).
 *   2. CLAUDE.md untouched for >30 days (mtime only — content may be fine) →
 *      soft nudge toward /ccc-adopt --check.
 *
 * Respects CC_NUDGE_DISABLE=1. Always exits 0, always fail-open.
 */
import { stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { emitUser } from './lib/emit.mjs';

const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

// Cheap "this repo contains code" signals — no directory walking.
const CODE_MARKERS = ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'Gemfile', 'composer.json', 'src', 'lib'];

function looksLikeCodeRepo(cwd) {
  // .git may be a directory (normal repo) or a file (worktree) — existsSync handles both.
  if (!existsSync(join(cwd, '.git'))) return false;
  return CODE_MARKERS.some(m => existsSync(join(cwd, m)));
}

async function onceOnlyToday(env, cwd) {
  // Once-per-project-per-day marker; returns false if already nudged today.
  try {
    const markerDir = join(env.HOME || homedir(), '.claude', 'commander');
    const projectHash = createHash('sha256').update(cwd).digest('hex').slice(0, 12);
    const today = new Date().toISOString().slice(0, 10);
    const markerFile = join(markerDir, `claudemd-nudge-${projectHash}-${today}`);
    if (existsSync(markerFile)) return false;
    await mkdir(markerDir, { recursive: true });
    try { await writeFile(markerFile, '', { flag: 'wx' }); } catch { return false; }
    return true;
  } catch {
    return false;
  }
}

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
      // Missing-file branch: nudge once/day when this is clearly a code repo.
      if (looksLikeCodeRepo(cwd) && await onceOnlyToday(env, cwd)) {
        return emitUser('📝 No CLAUDE.md — run /ccc-adopt to generate one tuned to your stack (asks before writing)');
      }
      return { continue: true };
    }
    const ageMs = Date.now() - fileStat.mtimeMs;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    if (ageMs > STALE_MS && await onceOnlyToday(env, cwd)) {
      return emitUser(`💡 CLAUDE.md untouched for ${ageDays}d — worth a /ccc-adopt --check drift pass? (mtime only — it may be fine)`);
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
