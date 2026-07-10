#!/usr/bin/env node
// CC Commander — ambient intelligence ticker
//
// UserPromptSubmit hook. Runs on every user turn. Cheap, non-blocking.
// Computes project state signals → picks an involvement level (1-4) →
// writes ~/.claude/commander/project-state.json for /ccc-suggest and
// other skills to read.
//
// Payload arrives on STDIN (standard hook contract — same pattern as
// intent-classifier.js). When suggestion confidence ≥ 0.8 the ticker emits
// additionalContext instructing the model to offer the skill via
// AskUserQuestion chips — hooks can't call AUQ; the model can.
//
// Signals (real, cached — no stubs):
//   ciStatus     — `gh run list` conclusion, refreshed in a detached
//                  background process, cache ≤10 min (never blocks the hook)
//   testsStatus  — last test-command outcome cached by knowledge-capture.js
//                  (PostToolUse) in ~/.claude/commander/last-test-result.json
//   lintStatus / securityAlerts — same PostToolUse cache (lint/audit kinds)
//
// Environment overrides:
//   CCC_SUGGEST_DISABLE=1   — fully disable ambient mode
//   CCC_SUGGEST_LEVEL=1..4  — hard-lock involvement level
//   CCC_SUGGEST_VERBOSE=1   — log to stderr (debug)

import { track } from '../lib/telemetry.mjs';
import { emitModel, emitSilent } from './lib/emit.mjs';
import { computeConfidence } from './lib/confidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STATE_DIR = path.join(os.homedir(), '.claude', 'commander');
const STATE_FILE = path.join(STATE_DIR, 'project-state.json');
const LOG_FILE = path.join(STATE_DIR, 'suggest-log.jsonl');
const CI_CACHE_FILE = path.join(STATE_DIR, 'ci-status-cache.json');
const TEST_CACHE_FILE = path.join(STATE_DIR, 'last-test-result.json');
const VIOLATIONS_FILE = path.join(STATE_DIR, 'clickability-violations.jsonl');
const VIOLATIONS_SEEN_FILE = path.join(STATE_DIR, 'clickability-last-seen.json');

const CI_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TEST_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

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

/** Resolve the repo's default branch (origin/HEAD), fallback origin/main. */
export function defaultBranchRef() {
  const ref = runCmd('git', ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  if (ref && ref.startsWith('refs/remotes/')) return ref.slice('refs/remotes/'.length);
  return 'origin/main';
}

/**
 * CI status from a ≤10-min cache of `gh run list --limit 1 --json conclusion`.
 * Reads whatever cache exists NOW; if stale, refreshes in a DETACHED
 * background process so the 2s hook budget is never at risk.
 */
function ciStatusCached() {
  let status = 'unknown';
  let fresh = false;
  try {
    const st = fs.statSync(CI_CACHE_FILE);
    fresh = Date.now() - st.mtimeMs < CI_CACHE_MAX_AGE_MS;
    const raw = JSON.parse(fs.readFileSync(CI_CACHE_FILE, 'utf8'));
    const conclusion = Array.isArray(raw) ? raw[0]?.conclusion : raw?.conclusion;
    if (conclusion === 'success') status = 'passing';
    else if (conclusion === 'failure' || conclusion === 'timed_out') status = 'failing';
  } catch {}

  if (!fresh) {
    try {
      const tmp = CI_CACHE_FILE + '.tmp';
      const child = spawn('/bin/sh', ['-c',
        `gh run list --limit 1 --json conclusion > ${JSON.stringify(tmp)} 2>/dev/null && mv ${JSON.stringify(tmp)} ${JSON.stringify(CI_CACHE_FILE)}`,
      ], { detached: true, stdio: 'ignore' });
      child.unref();
    } catch {}
  }
  return status;
}

/** Test/lint/audit outcomes cached by knowledge-capture.js (PostToolUse). */
function toolResultCache() {
  const out = { testsStatus: 'unknown', lintStatus: 'unknown', securityAlerts: 0 };
  try {
    const cache = JSON.parse(fs.readFileSync(TEST_CACHE_FILE, 'utf8'));
    const now = Date.now();
    for (const kind of ['test', 'lint', 'audit']) {
      const entry = cache[kind];
      if (!entry || !entry.ts || now - new Date(entry.ts).getTime() > TEST_CACHE_MAX_AGE_MS) continue;
      if (kind === 'test') out.testsStatus = entry.status;
      if (kind === 'lint') out.lintStatus = entry.status;
      if (kind === 'audit' && entry.status === 'failing') out.securityAlerts = 1;
    }
  } catch {}
  return out;
}

export function computeState(promptText = '') {
  const branch = runCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const defaultBranch = defaultBranchRef();
  const aheadBehind = runCmd('git', ['rev-list', '--left-right', '--count', `HEAD...${defaultBranch}`]).split('\t');
  const aheadMain = parseInt(aheadBehind[0] || '0', 10);
  const behindMain = parseInt(aheadBehind[1] || '0', 10);
  const hasClaudeMd = fs.existsSync('CLAUDE.md');
  const hasTodos = fs.existsSync('tasks/todo.md');
  const stack = detectProjectStack();

  // Real, cached signals (see header) — never a blocking network call.
  const ciStatus = ciStatusCached();
  const { testsStatus, lintStatus, securityAlerts } = toolResultCache();
  const lintErrors = lintStatus === 'failing' ? 1 : 0;

  // CLAUDE.md age (days) — consumed by /ccc-suggest + suggest-lightweight.
  let claudeMdAgeDays = null;
  try {
    if (hasClaudeMd) {
      claudeMdAgeDays = Math.floor((Date.now() - fs.statSync('CLAUDE.md').mtimeMs) / 86400000);
    }
  } catch {}

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
  const blockers =
    (ciStatus === 'failing' ? 1 : 0) +
    (testsStatus === 'failing' ? 1 : 0) +
    (securityAlerts > 0 ? 1 : 0) +
    (lintStatus === 'failing' ? 1 : 0);
  if (blockers >= 1) recommendedLevel = 3;      // assertive when blockers exist
  if (blockers === 0 && aheadMain === 0 && behindMain === 0 && !hasTodos) recommendedLevel = 1; // passive when calm

  // Prompt-phrase overrides: the user is explicitly asking for direction.
  if (promptText && /\b(what next|what should i do|help me decide|i'?m stuck|where do i start)\b/i.test(promptText)) {
    recommendedLevel = 3;
  }

  // Hard overrides
  const envLevel = process.env.CCC_SUGGEST_LEVEL;
  if (envLevel && /^[1-4]$/.test(envLevel)) recommendedLevel = parseInt(envLevel, 10);
  if (process.env.CCC_SUGGEST_DISABLE === '1') recommendedLevel = 0;

  // Three PM lenses — derived from signals already computed above, no new scans.
  const pmLenses = {
    audit: aheadMain > 0,
    scope: !hasTodos && aheadMain > 0,
    improve: lintErrors > 0 || ciStatus === 'failing' || testsStatus === 'failing',
  };

  return {
    timestamp: new Date().toISOString(),
    branch,
    defaultBranch,
    aheadMain,
    behindMain,
    hasClaudeMd,
    claudeMdAgeDays,
    openTodos: hasTodos ? 1 : 0,
    lastSession,
    stack,
    testsStatus,
    ciStatus,
    lintStatus,
    securityAlerts,
    lintErrors,
    recommendedLevel,
    pmLenses,
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

/**
 * Pure-function entry for orchestrator (CC-414).
 * Async wrapper around main() — returns the same JSON object.
 * Note: suggest-ticker is currently UserPromptSubmit, not SessionStart, but
 * exposing run() lets a future orchestrator wave merge it too.
 */
export async function run({ input = {}, env = process.env, cwd = process.cwd() } = {}) {
  return main(input);
}

/**
 * Emit a once-per-session nudge to arm the PM loop (`/ccc-suggest loop`) when
 * the session looks active but no loop is armed yet. Mirrors the fable-nudge
 * marker-file pattern in intent-classifier.js — one line, never repeated.
 * "Active" = last-suggestion.json shows several turns, OR project-state.json
 * is already older than a day (long-running/reopened session). Non-blocking,
 * fail-open. Respects CCC_SUGGEST_DISABLE.
 */
function maybeLoopNudge(lastState) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') return null;
  try {
    const loopStateFile = path.join(process.cwd(), '.claude', 'loop-state', 'ccc-suggest.json');
    if (fs.existsSync(loopStateFile)) return null; // loop already armed

    const markerFile = path.join(STATE_DIR, `loop-nudge-${new Date().toISOString().slice(0, 10)}`);
    if (fs.existsSync(markerFile)) return null; // already nudged today

    let turnCount = 0;
    try {
      const lastSuggestion = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'last-suggestion.json'), 'utf8'));
      turnCount = lastSuggestion.turnCount || 0;
    } catch {}
    const stateIsStale = lastState && (Date.now() - new Date(lastState.timestamp).getTime()) > 86400000;
    if (turnCount < 5 && !stateIsStale) return null;

    try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch {}
    try { fs.writeFileSync(markerFile, '', { flag: 'wx' }); } catch { return null; }

    return '💡 Consider arming the always-on PM loop: /ccc-suggest loop — improve/scope/audit lenses every tick, anti-nag state file.';
  } catch {
    return null; // fail-open — never break the hook chain
  }
}

/**
 * Emit a brief ultracode hint if the user's prompt matches high-complexity keywords.
 * Non-blocking — only fires when keywords clearly signal a workflow-scale task.
 * Returns a hint string, or null if no match.
 */
function maybeUltracodeHint(promptText) {
  if (!promptText || typeof promptText !== 'string') return null;
  const WORKFLOW_KEYWORDS = /\b(migrat|audit|refactor\s+across|repo[\s-]?wide|every\s+file|all\s+endpoint|sweep|codebase[\s-]?wide)\b/i;
  if (!WORKFLOW_KEYWORDS.test(promptText)) return null;
  // Don't hint if user already mentions workflow/ultracode — they know
  if (/\b(workflow|ultracode|\/effort)\b/i.test(promptText)) return null;
  return '💡 This looks like a workflow-scale task — consider `/effort ultracode` or adding `workflow` to your prompt for adversarially verified, multi-agent results.';
}

/**
 * One-turn clickability reminder: if clickability-watch logged a violation
 * since we last looked, remind the model once (F17 loop-closing).
 */
function maybeClickabilityReminder() {
  try {
    if (!fs.existsSync(VIOLATIONS_FILE)) return null;
    const lastSeen = (() => {
      try { return JSON.parse(fs.readFileSync(VIOLATIONS_SEEN_FILE, 'utf8')).ts || 0; } catch { return 0; }
    })();
    const st = fs.statSync(VIOLATIONS_FILE);
    if (st.mtimeMs <= lastSeen) return null;

    // Tail-read the last line only (file is rotated small)
    const raw = fs.readFileSync(VIOLATIONS_FILE, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const last = lines.length ? JSON.parse(lines[lines.length - 1]) : null;
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(VIOLATIONS_SEEN_FILE, JSON.stringify({ ts: Date.now() }));
    } catch {}
    if (!last) return null;
    return `⚠️ A previous reply offered choices as plain text ("${last.pattern}"). When offering 2+ choices this turn, use AskUserQuestion chips — never a typed-letter list.`;
  } catch {
    return null;
  }
}

function main(payload = {}) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') {
    return emitSilent();
  }

  const modelNotes = [];

  const promptText = typeof payload.prompt === 'string'
    ? payload.prompt
    : (payload.message && payload.message.content) || '';

  // Ultracode hint — model-facing, never blocks the chain
  try {
    const hint = maybeUltracodeHint(promptText);
    if (hint) modelNotes.push(hint);
  } catch { /* fail-open — never block the hook chain */ }

  // Clickability loop-closing reminder (one turn per violation batch)
  try {
    const reminder = maybeClickabilityReminder();
    if (reminder) modelNotes.push(reminder);
  } catch { /* fail-open */ }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch {}

  let lastState = null;
  try {
    lastState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}

  // PM loop nudge — once per session/day, never repeated. Fail-open.
  try {
    const loopNudge = maybeLoopNudge(lastState);
    if (loopNudge) modelNotes.push(loopNudge);
  } catch { /* fail-open — never break the hook chain */ }

  if (!shouldRun(lastState)) {
    if (modelNotes.length) return emitModel('UserPromptSubmit', modelNotes.join('\n'));
    return emitSilent();
  }

  const state = computeState(promptText);

  // Persist
  try {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}

  // Hook→AUQ-chip bridge: at confidence ≥ 0.8 instruct the model to OFFER the
  // top suggestion via AskUserQuestion chips (hooks can't call AUQ; the model can).
  try {
    const { confidence, suggestions } = computeConfidence(state);
    if (confidence >= 0.8 && suggestions.length > 0 && state.recommendedLevel >= 2) {
      const top = suggestions[0];
      modelNotes.push(
        `CCC ambient suggestion: ${top.skill} — ${top.reason}. ` +
        `If you finish the user's request with room to spare, offer it via AskUserQuestion ` +
        `with options [⭐ Run ${top.skill}, Dismiss, /ccc-browse] — never a typed-letter list.`
      );
    }
  } catch { /* fail-open */ }

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
    process.stderr.write(`ccc-suggest ticker: level=${state.recommendedLevel} stack=[${state.stack.join(',')}] ahead=${state.aheadMain} ci=${state.ciStatus} tests=${state.testsStatus}\n`);
  }

  if (modelNotes.length) return emitModel('UserPromptSubmit', modelNotes.join('\n'));
  return emitSilent();
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
  (async () => {
    // Read the hook payload from stdin (standard contract — see intent-classifier.js)
    let payload = {};
    try {
      let input = '';
      for await (const chunk of process.stdin) input += chunk;
      if (input.trim()) payload = JSON.parse(input);
    } catch { payload = {}; }

    try {
      const result = main(payload);
      track('hook_fired', { hook: 'UserPromptSubmit', handler: 'suggest-ticker' });

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
  })();
}
