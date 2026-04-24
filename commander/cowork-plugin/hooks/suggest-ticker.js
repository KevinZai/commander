#!/usr/bin/env node
// CC Commander — ambient intelligence ticker
//
// UserPromptSubmit hook. Runs on every user turn. Cheap, non-blocking.
// Computes project state signals → picks an involvement level (1-4) →
// writes ~/.claude/commander/project-state.json for /ccc-suggest and
// other skills to read.
//
// Does NOT invoke Opus. This is a signals-gathering pass only. The actual
// Opus reasoning happens when /ccc-suggest is explicitly invoked OR when
// this ticker detects a blocker state requiring Level 3+ intervention.
//
// Environment overrides:
//   CCC_SUGGEST_DISABLE=1   — fully disable ambient mode
//   CCC_SUGGEST_LEVEL=1..4  — hard-lock involvement level
//   CCC_SUGGEST_VERBOSE=1   — log to stderr (debug)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STATE_DIR = path.join(os.homedir(), '.claude', 'commander');
const STATE_FILE = path.join(STATE_DIR, 'project-state.json');
const LOG_FILE = path.join(STATE_DIR, 'suggest-log.jsonl');

// Fast, failure-tolerant exec (timeout 1s, returns '' on error).
// Uses execFileSync + argv array (no shell interpolation) for safety.
function runCmd(file, args, opts = {}) {
  try {
    return execFileSync(file, args, { encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'], ...opts }).trim();
  } catch {
    return '';
  }
}

export function detectProjectStack() {
  const signals = [];
  try {
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) signals.push('nextjs');
      if (deps.react) signals.push('react');
      if (deps.vite) signals.push('vite');
      if (deps.tailwindcss) signals.push('tailwind');
      if (deps['@supabase/supabase-js']) signals.push('supabase');
      if (deps.stripe) signals.push('stripe');
      if (deps.prisma) signals.push('prisma');
      if (deps.fastify) signals.push('fastify');
      if (deps.hono) signals.push('hono');
    }
    if (fs.existsSync('pyproject.toml')) signals.push('python');
    if (fs.existsSync('Cargo.toml')) signals.push('rust');
    if (fs.existsSync('go.mod')) signals.push('go');
    if (fs.existsSync('Dockerfile')) signals.push('docker');
  } catch {}
  return signals;
}

export function computeState() {
  const branch = runCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const aheadBehind = runCmd('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main']).split('\t');
  const aheadMain = parseInt(aheadBehind[0] || '0', 10);
  const behindMain = parseInt(aheadBehind[1] || '0', 10);
  const hasClaudeMd = fs.existsSync('CLAUDE.md');
  const hasTodos = fs.existsSync('tasks/todo.md');
  const stack = detectProjectStack();

  // Non-blocking: these checks may fail silently
  const testsStatus = 'unknown'; // would require running tests — skip for perf
  const ciStatus = 'unknown';    // would require gh api — skip for perf
  const securityAlerts = 0;
  const lintErrors = 0;

  // Recent session (fs-based, no shell-out for path safety)
  let lastSession = null;
  try {
    const sessDir = path.join(os.homedir(), '.claude', 'sessions');
    if (fs.existsSync(sessDir)) {
      const files = fs.readdirSync(sessDir)
        .filter(f => f.endsWith('.tmp'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(sessDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length > 0) lastSession = path.join(sessDir, files[0].name);
    }
  } catch {}

  // Level decision heuristic
  let recommendedLevel = 2; // default: gentle nudge
  const blockers = (ciStatus === 'failing' ? 1 : 0) + (securityAlerts > 0 ? 1 : 0) + (lintErrors > 10 ? 1 : 0);
  if (blockers >= 1) recommendedLevel = 3;      // assertive when blockers exist
  if (aheadMain === 0 && behindMain === 0 && !hasTodos) recommendedLevel = 1; // passive when calm

  // Hard overrides
  const envLevel = process.env.CCC_SUGGEST_LEVEL;
  if (envLevel && /^[1-4]$/.test(envLevel)) recommendedLevel = parseInt(envLevel, 10);
  if (process.env.CCC_SUGGEST_DISABLE === '1') recommendedLevel = 0;

  return {
    timestamp: new Date().toISOString(),
    branch,
    aheadMain,
    behindMain,
    hasClaudeMd,
    openTodos: hasTodos ? 1 : 0,
    lastSession,
    stack,
    testsStatus,
    ciStatus,
    securityAlerts,
    lintErrors,
    recommendedLevel,
    lastRecommendation: null, // populated when /ccc-suggest runs
  };
}

function shouldRun(lastState) {
  // Throttle: only refresh every 5 turns (signal decay is slow)
  if (!lastState) return true;
  try {
    const last = new Date(lastState.timestamp).getTime();
    const ageMs = Date.now() - last;
    return ageMs > 30000; // 30s — roughly every 5-10 turns
  } catch {
    return true;
  }
}

function main() {
  if (process.env.CCC_SUGGEST_DISABLE === '1') {
    return { continue: true, suppressOutput: true };
  }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch {}

  let lastState = null;
  try {
    lastState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}

  if (!shouldRun(lastState)) {
    return { continue: true, suppressOutput: true };
  }

  const state = computeState();

  // Persist
  try {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}

  // Log for telemetry — with size-based rotation (keep last ~500 lines)
  try {
    const line = JSON.stringify({
      ts: state.timestamp,
      level: state.recommendedLevel,
      branch: state.branch,
      stack: state.stack,
    }) + '\n';
    fs.appendFileSync(LOG_FILE, line);
    // Rotate if file exceeds 100KB (~500 lines at avg size)
    try {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > 100 * 1024) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const kept = lines.slice(-500).join('\n') + '\n';
        fs.writeFileSync(LOG_FILE, kept);
      }
    } catch {}
  } catch {}

  if (process.env.CCC_SUGGEST_VERBOSE === '1') {
    process.stderr.write(`ccc-suggest ticker: level=${state.recommendedLevel} stack=[${state.stack.join(',')}] ahead=${state.aheadMain}\n`);
  }

  return { continue: true, suppressOutput: true };
}

// ESM equivalent of `require.main === module` — only run when executed directly.
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (isMain) {
  try {
    const result = main();
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(0);
  } catch (err) {
    // Fail-open — never block the hook chain
    if (process.env.CCC_SUGGEST_VERBOSE === '1') {
      process.stderr.write(`ccc-suggest ticker error: ${err.message}\n`);
    }
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    process.exit(0);
  }
}
