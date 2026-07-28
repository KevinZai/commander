#!/usr/bin/env node
// CC Commander — ambient intelligence ticker
//
// UserPromptSubmit hook. Runs on every user turn. Cheap, non-blocking.
// Computes project state signals → picks an involvement level (1-4) →
// writes ~/.claude/commander/projects/<slug>/project-state.json (per-project
// since v7.3.0 — see "Per-project state keying" below) for /ccc-suggest and
// other skills to read.
//
// Payload arrives on STDIN (standard hook contract — same pattern as
// intent-classifier.js). When suggestion confidence ≥ 0.8 the ticker emits
// additionalContext instructing the model to offer the skill via
// AskUserQuestion chips — hooks can't call AUQ; the model can. Also produces
// entries into mission-control/suggestions.jsonl at that same confidence bar
// (see produceSuggestion()) so Mission Control's Suggestions panel has a
// real feed.
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
import { appendSuggestion, readSuggestions } from '../lib/suggestions.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STATE_DIR = path.join(os.homedir(), '.claude', 'commander');
const LOG_FILE = path.join(STATE_DIR, 'suggest-log.jsonl');
const TEST_CACHE_FILE = path.join(STATE_DIR, 'last-test-result.json');
const VIOLATIONS_FILE = path.join(STATE_DIR, 'clickability-violations.jsonl');
const VIOLATIONS_SEEN_FILE = path.join(STATE_DIR, 'clickability-last-seen.json');

// ---------------------------------------------------------------------------
// Per-project state keying (codex finding 10, CC-1386 W4 item 1).
//
// project-state.json / ci-status-cache.json / last-suggestion.json /
// suggest-dismissed.json used to live flat under STATE_DIR — one file shared
// by EVERY repo on the machine, so repo B's ticker read repo A's branch/CI/
// dismissal state. Those four are now keyed under
// ~/.claude/commander/projects/<slug>/, slug = basename(cwd) + '-' +
// 8-char sha256(cwd). cwd is read from the hook's stdin payload.cwd first
// (the documented field in Claude Code's hook contract), falling back to
// process.cwd() only when the payload doesn't carry one.
//
// Migration: legacy flat files are NEVER read as a fallback (would silently
// mix data from whichever repo wrote them last) and NEVER deleted (no-deletes
// rule) — they just go frozen/stale in place. Known remaining readers of the
// legacy path (pre-compact.js, ccc-suggest/SKILL.md, ccc-claudemd/SKILL.md)
// are outside this hook's ownership — flagged separately, not fixed here.
//
// TEST/lint/audit caches (last-test-result.json) and the cross-hook JSONL
// feeds (subagent-runs / agent-runs / tasks / tool-failures / violations)
// are written by OTHER hooks this file doesn't own — moving only the READ
// side here would silently break those signals (the writer would keep
// writing the global path forever), which is worse than today's leak. Left
// global; a matching fix belongs with whichever hook owns each writer.
const PROJECTS_DIR = path.join(STATE_DIR, 'projects');

/** cwd per the hook contract: payload.cwd first, process.cwd() fallback. */
export function resolveCwd(payload) {
  if (payload && typeof payload.cwd === 'string' && payload.cwd.trim()) {
    return payload.cwd;
  }
  return process.cwd();
}

/** basename(cwd) + '-' + 8-char sha256(cwd) — stable, filesystem-safe. */
export function projectSlug(cwd) {
  const safeCwd = typeof cwd === 'string' && cwd ? cwd : process.cwd();
  const rawBase = path.basename(safeCwd) || 'root';
  const base = rawBase.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 60) || 'root';
  const hash = crypto.createHash('sha256').update(safeCwd).digest('hex').slice(0, 8);
  return `${base}-${hash}`;
}

/** ~/.claude/commander/projects/<slug>/ for the given cwd. */
export function projectDir(cwd) {
  return path.join(PROJECTS_DIR, projectSlug(cwd));
}

function projectStateFile(cwd) { return path.join(projectDir(cwd), 'project-state.json'); }
function projectCiCacheFile(cwd) { return path.join(projectDir(cwd), 'ci-status-cache.json'); }
function projectLastSuggestionFile(cwd) { return path.join(projectDir(cwd), 'last-suggestion.json'); }

// Proactivity-wave inputs (written by subagent-start-tracker.js,
// agent-run-logger.js, task-tracker.js, post-tool-failure-logger.js).
const SUBAGENT_RUNS_FILE = path.join(STATE_DIR, 'subagent-runs.jsonl');
const AGENT_RUNS_FILE = path.join(STATE_DIR, 'agent-runs.jsonl');
const TASKS_FILE = path.join(STATE_DIR, 'tasks.jsonl');
const TOOL_FAILURES_FILE = path.join(STATE_DIR, 'tool-failures.jsonl');

// Proactivity-wave anti-nag state (same pattern as spawn-nudge-seen.json).
const MC_NUDGE_SEEN_FILE = path.join(STATE_DIR, 'mission-control-nudge-seen.json');
const METRIC_LOOP_SEEN_FILE = path.join(STATE_DIR, 'metric-loop-nudge-seen.json');
const VAGUE_PROMPT_SEEN_FILE = path.join(STATE_DIR, 'vague-prompt-nudge-seen.json');
const TOOL_FAILURES_SEEN_FILE = path.join(STATE_DIR, 'tool-failures-nudge-seen.json');

const CI_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TEST_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const IN_FLIGHT_WINDOW_MS = 30 * 60 * 1000; // agents/tasks considered "current"
const TOOL_FAILURE_WINDOW_MS = 10 * 60 * 1000; // failures considered "recent"
const TOOL_FAILURE_COOLDOWN_MS = 30 * 60 * 1000; // re-nudge cooldown
const CLOCK_SKEW_MS = 60 * 1000; // tolerate slightly-future ts values
const JSONL_TAIL_BYTES = 64 * 1024; // logs rotate at 10MB — only tail-read

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
 * cacheFile is per-project (see projectCiCacheFile) — self-contained,
 * written and read only by this function, so it's safe to key per-project.
 */
function ciStatusCached(cacheFile) {
  let status = 'unknown';
  let fresh = false;
  try {
    const st = fs.statSync(cacheFile);
    fresh = Date.now() - st.mtimeMs < CI_CACHE_MAX_AGE_MS;
    const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const conclusion = Array.isArray(raw) ? raw[0]?.conclusion : raw?.conclusion;
    if (conclusion === 'success') status = 'passing';
    else if (conclusion === 'failure' || conclusion === 'timed_out') status = 'failing';
  } catch {}

  if (!fresh) {
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      const tmp = cacheFile + '.tmp';
      const child = spawn('/bin/sh', ['-c',
        `gh run list --limit 1 --json conclusion > ${JSON.stringify(tmp)} 2>/dev/null && mv ${JSON.stringify(tmp)} ${JSON.stringify(cacheFile)}`,
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

export function computeState(promptText = '', cwd = process.cwd()) {
  const branch = runCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const defaultBranch = defaultBranchRef();
  const aheadBehind = runCmd('git', ['rev-list', '--left-right', '--count', `HEAD...${defaultBranch}`]).split('\t');
  const aheadMain = parseInt(aheadBehind[0] || '0', 10);
  const behindMain = parseInt(aheadBehind[1] || '0', 10);
  const hasClaudeMd = fs.existsSync('CLAUDE.md');
  const hasTodos = fs.existsSync('tasks/todo.md');
  const stack = detectProjectStack();

  // Real, cached signals (see header) — never a blocking network call.
  const ciStatus = ciStatusCached(projectCiCacheFile(cwd));
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
function maybeLoopNudge(lastState, cwd = process.cwd()) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') return null;
  try {
    const loopStateFile = path.join(process.cwd(), '.claude', 'loop-state', 'ccc-suggest.json');
    if (fs.existsSync(loopStateFile)) return null; // loop already armed

    const markerFile = path.join(STATE_DIR, `loop-nudge-${new Date().toISOString().slice(0, 10)}`);
    if (fs.existsSync(markerFile)) return null; // already nudged today

    let turnCount = 0;
    try {
      const lastSuggestion = JSON.parse(fs.readFileSync(projectLastSuggestionFile(cwd), 'utf8'));
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
  // `/ccc-ultracode` is the skill; `ultracode` is NOT a valid --effort level
  // (low|medium|high|xhigh|max), so never suggest it as one.
  return '💡 This looks like a workflow-scale task — consider `/ccc-ultracode` or adding `workflow` to your prompt for adversarially verified, multi-agent results.';
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

/**
 * Detect when the user's prompt describes an ISOLATED / PARALLEL unit of work
 * — something that would be better handled in its own session than derailing
 * the current thread. Pure function; returns { reason, phrase } or null.
 *
 * Precision over recall: fires only on strong isolation phrasing, never on a
 * bare "also" (too common). If the user already knows about spawning
 * (mentions spawn / fleet / a separate session by name), we stay silent —
 * they don't need the nudge.
 */
export function detectIsolationSignal(promptText) {
  if (!promptText || typeof promptText !== 'string') return null;
  // User already knows the spawn surface — don't nudge them toward it.
  if (/\b(spawn|\/spawn|spawn_task|ccc-fleet|fleet-worker|new session|separate session)\b/i.test(promptText)) {
    return null;
  }
  const STRONG = [
    { re: /\b(in the background|as a background task|background job)\b/i, reason: 'a background job' },
    { re: /\b(in parallel|on the side|on a separate track|meanwhile|while you'?re at it)\b/i, reason: 'parallel work' },
    { re: /\b(spin (up|off)|kick off) (a|an|another)\b/i, reason: 'a spun-off task' },
    { re: /\b(handle|do|run) (this|that|it|the [\w-]+(?:\s+[\w-]+){0,3}) (separately|independently|on its own)\b/i, reason: 'an independent task' },
    { re: /\b(separately|unrelated|different (repo|project|codebase))[,:]/i, reason: 'a separate, unrelated task' },
    { re: /\b(while (i|you)('| a)?m? (away|out|afk|asleep|at lunch|gone))\b/i, reason: 'unattended work' },
  ];
  for (const { re, reason } of STRONG) {
    const m = promptText.match(re);
    if (m) return { reason, phrase: m[0] };
  }
  return null;
}

/**
 * Proactive isolation-spawn nudge (CC-1370 slice 1). When the prompt describes
 * isolated/parallel work, instruct the model to OFFER spinning it into its own
 * session — surface-aware: a spawn_task chip in Cowork Desktop, or `/spawn
 * quick` in the CLI. Hooks can't call spawn_task/AskUserQuestion; the model can
 * — same bridge pattern as the AUQ suggestion below.
 *
 * Anti-nag: the same detected phrase is suggested at most once (deduped via a
 * seen-file), so a lingering phrase across turns doesn't repeat. Respects
 * CCC_SUGGEST_DISABLE. Fail-open — never breaks the hook chain.
 */
function maybeSpawnNudge(promptText) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') return null;
  try {
    const signal = detectIsolationSignal(promptText);
    if (!signal) return null;

    const seenFile = path.join(STATE_DIR, 'spawn-nudge-seen.json');
    const key = signal.phrase.toLowerCase().replace(/\s+/g, ' ').trim();
    let last = '';
    try { last = JSON.parse(fs.readFileSync(seenFile, 'utf8')).key || ''; } catch {}
    if (key === last) return null; // same phrase already nudged — don't nag

    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(seenFile, JSON.stringify({ key, ts: Date.now() }));
    } catch {}

    return (
      `CCC isolation signal: the user described ${signal.reason} ("${signal.phrase}"). ` +
      `Once the immediate ask is handled, OFFER to run it in its own session instead of derailing this thread — ` +
      `in Claude Cowork via a spawn_task chip [⭐ Spawn as separate session, Keep here, Dismiss]; ` +
      `in the Claude Code CLI via \`/spawn quick <task>\`. Do not spawn without the user's go-ahead.`
    );
  } catch {
    return null; // fail-open
  }
}

/**
 * Tail-read a JSONL file (last JSONL_TAIL_BYTES only — the source logs rotate
 * at 10MB, so a full read could blow the 2s hook budget). Malformed lines are
 * skipped; a missing file reads as empty. Never throws.
 */
function readJsonlTail(file, maxBytes = JSONL_TAIL_BYTES) {
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size === 0) return [];
    const start = Math.max(0, st.size - maxBytes);
    const fd = fs.openSync(file, 'r');
    let text;
    try {
      const len = st.size - start;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);
      text = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
    if (start > 0) {
      const nl = text.indexOf('\n');
      text = nl === -1 ? '' : text.slice(nl + 1); // drop the partial first line
    }
    const out = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') out.push(parsed);
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

function tsWithinWindow(rawTs, windowStart, now) {
  const t = Date.parse(rawTs);
  return Number.isFinite(t) && t >= windowStart && t <= now + CLOCK_SKEW_MS;
}

/**
 * Agents currently running: SubagentStart records (subagent-runs.jsonl) in the
 * last 30 min lacking a matching SubagentStop record (agent-runs.jsonl).
 * Matched per agent name by count — N starts with M stops = N-M in flight.
 */
function countAgentsInFlight(now = Date.now()) {
  const windowStart = now - IN_FLIGHT_WINDOW_MS;
  const startCounts = new Map();
  for (const e of readJsonlTail(SUBAGENT_RUNS_FILE)) {
    if (!tsWithinWindow(e.ts, windowStart, now)) continue;
    const name = typeof e.agent_name === 'string' && e.agent_name ? e.agent_name : 'unknown';
    startCounts.set(name, (startCounts.get(name) || 0) + 1);
  }
  if (startCounts.size === 0) return 0;
  const stopCounts = new Map();
  for (const e of readJsonlTail(AGENT_RUNS_FILE)) {
    if (!tsWithinWindow(e.ts, windowStart, now)) continue;
    const name = typeof e.agent === 'string' && e.agent ? e.agent : 'unknown';
    stopCounts.set(name, (stopCounts.get(name) || 0) + 1);
  }
  let running = 0;
  for (const [name, starts] of startCounts) {
    running += Math.max(0, starts - (stopCounts.get(name) || 0));
  }
  return running;
}

/**
 * Tasks still open: tasks.jsonl entries in the last 30 min whose LATEST status
 * per task_id is in_progress/pending (a later completed line clears the task).
 */
function countActiveTasks(now = Date.now()) {
  const windowStart = now - IN_FLIGHT_WINDOW_MS;
  const latest = new Map();
  let i = 0;
  for (const e of readJsonlTail(TASKS_FILE)) {
    i += 1;
    if (!tsWithinWindow(e.ts, windowStart, now)) continue;
    const key = e.task_id != null && e.task_id !== '' ? String(e.task_id) : `line-${i}`;
    latest.set(key, e.status);
  }
  let active = 0;
  for (const status of latest.values()) {
    if (status === 'in_progress' || status === 'pending') active += 1;
  }
  return active;
}

/** Failed tool calls in the last 10 min (tool-failures.jsonl, PostToolUseFailure). */
function countRecentToolFailures(now = Date.now()) {
  if (!fs.existsSync(TOOL_FAILURES_FILE)) return 0;
  const windowStart = now - TOOL_FAILURE_WINDOW_MS;
  let count = 0;
  for (const e of readJsonlTail(TOOL_FAILURES_FILE)) {
    if (tsWithinWindow(e.ts, windowStart, now)) count += 1;
  }
  return count;
}

/**
 * Measurable-goal phrasing: "reduce X to 200ms", "get revenue above $10k",
 * "keep trying until it passes" — work /ccc-loop can iterate against.
 * Pure function; exported for unit tests.
 */
export function detectMetricLoopSignal(promptText) {
  if (!promptText || typeof promptText !== 'string') return false;
  return /(improve|raise|increase|reduce|lower|get|bring) .{0,40}(to|below|under|above|past) [0-9$%]|until it (works|passes)|keep (trying|going) until/i.test(promptText);
}

/**
 * Vague ask: short prompt ("fix it", "make the app better") with a fuzzy
 * object and zero specifics — no path, no backtick, no number, no file.ext.
 * Precision over recall: any concrete anchor disqualifies. Pure; exported.
 */
export function detectVaguePrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') return false;
  const words = promptText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length >= 12) return false;
  if (!/(fix|improve|make|do|build|clean|update) (it|this|that|the app|the site|everything)\b/i.test(promptText)) return false;
  if (/[`/\\0-9]/.test(promptText)) return false; // path, backtick, or number
  if (/\b[\w-]+\.[a-z]{1,6}\b/i.test(promptText)) return false; // file.ext mention
  return true;
}

// ---------------------------------------------------------------------------
// New ticker signals (v7.3.0, CC-1386 W4 item 13) — update-available and
// stale-telemetry. Both cheap/local: a cached JSON read and a bounded JSONL
// tail read, never a network call. Each candidate carries its own
// {key, skill, reason, confidence} — key is the producer/anti-nag dedupe
// identity (version- or week-scoped, so it naturally re-arms when the
// underlying fact changes). Global (not per-project): the update state and
// the mission-control telemetry feed are both install-wide facts, not
// per-repo ones.
// ---------------------------------------------------------------------------

const UPDATE_NUDGE_CACHE_FILE = path.join(STATE_DIR, 'update-nudge.json');
const MC_EVENTS_FILE = path.join(STATE_DIR, 'mission-control', 'events.jsonl');
const STALE_TELEMETRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekBucket(now = Date.now()) {
  return Math.floor(now / WEEK_MS);
}

/**
 * update-available — reads the cache written by update-nudge.js's SessionStart
 * hook (a sibling workstream; ships independently, so this file's absence or
 * malformed shape is tolerated silently, not an error).
 */
function readUpdateAvailableSignal() {
  try {
    const raw = JSON.parse(fs.readFileSync(UPDATE_NUDGE_CACHE_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object' || raw.status !== 'outdated') return null;
    // STRICT re-validation at the READ side — the cache file is a trust
    // boundary too: a pre-validation plugin version (or hand-tampered file)
    // can carry a poisoned `latest` like "7.4.0-IGNORE_ALL_PRIOR..." that the
    // writer never sanitized, and whatever passes here is interpolated into
    // model-facing context. Anything but plain X.Y.Z → no signal.
    const STRICT_VERSION = /^\d+\.\d+\.\d+$/;
    const latest =
      typeof raw.latest === 'string' && STRICT_VERSION.test(raw.latest) ? raw.latest : null;
    if (!latest) return null;
    const installed =
      typeof raw.installed === 'string' && STRICT_VERSION.test(raw.installed) ? raw.installed : '?';
    return {
      key: `update-${latest}`,
      skill: '/ccc-update',
      reason: `CC Commander v${installed}→v${latest} available — run: claude plugin marketplace update commander-hub && claude plugin update commander@commander-hub (then restart)`,
      confidence: 0.9,
    };
  } catch {
    return null; // absent/malformed — the update-nudge feature ships together, tolerate silently
  }
}

/**
 * stale-telemetry — mission-control/events.jsonl hasn't been written to in
 * >7 days even though this session is clearly active (the ticker only runs
 * on a live UserPromptSubmit). Tail-read only (JSONL_TAIL_BYTES) — the file
 * is append-only, so the tail always contains the newest entries.
 */
function readStaleTelemetrySignal(now = Date.now()) {
  try {
    if (!fs.existsSync(MC_EVENTS_FILE)) return null;
    const entries = readJsonlTail(MC_EVENTS_FILE);
    if (entries.length === 0) return null;
    let newest = 0;
    for (const e of entries) {
      const t = Date.parse(e && e.ts);
      if (Number.isFinite(t) && t > newest) newest = t;
    }
    if (newest === 0 || now - newest <= STALE_TELEMETRY_MAX_AGE_MS) return null;
    const ageDays = Math.floor((now - newest) / 86400000);
    return {
      key: `stale-telemetry-${weekBucket(now)}`,
      skill: '/ccc-doctor',
      reason: `telemetry last written ${ageDays}d ago — hooks may not be running`,
      confidence: 0.85,
    };
  } catch {
    return null;
  }
}

// deck-stale (W4 item 13c) — SKIPPED. Deck HTML artifacts are written into
// the session's own scratchpad directory (a path the deck skills choose per
// run, e.g. /private/tmp/claude-.../scratchpad/), and there is no index or
// registry file this hook can read to find "the" deck path for a project.
// Comparing an mtime we can't reliably locate would mean inventing a path —
// against the "no pattern found → ask, don't invent" rule. Revisit once W2
// (deck freshness) ships a recorded deck-path registry (spec item 8).
function computeTickerSignals(now = Date.now()) {
  const out = [];
  const upd = readUpdateAvailableSignal();
  if (upd) out.push(upd);
  const stale = readStaleTelemetrySignal(now);
  if (stale) out.push(stale);
  return out;
}

function tickerSignalSeenFile(key) {
  const safe = String(key).replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(STATE_DIR, `ticker-signal-seen-${safe}.json`);
}

function alreadyNudgedTickerSignal(key) {
  return fs.existsSync(tickerSignalSeenFile(key));
}

function recordTickerSignalNudge(key) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(tickerSignalSeenFile(key), JSON.stringify({ ts: Date.now() }), { flag: 'wx' });
  } catch { /* already exists or write failed — fine either way */ }
}

/**
 * Model-facing notes for the new ticker signals — same bridge pattern as the
 * computeConfidence "top suggestion" block above (recommendedLevel >= 2 gate,
 * hooks can't call AskUserQuestion so the model is instructed to offer it).
 * Each signal nudges the model AT MOST ONCE per key (the key is
 * version/week-scoped, so a new version or a newly-stale week re-arms it) —
 * this file's own anti-nag, kept separate from suggest-lightweight.js's
 * dismissed[] mechanism, which independently governs the USER-facing render
 * via state.tickerSuggestions (see main()).
 */
function maybeTickerSignalNotes(state, signals) {
  const notes = [];
  if (state.recommendedLevel < 2) return notes;
  for (const sig of signals) {
    if (sig.confidence < 0.8 || alreadyNudgedTickerSignal(sig.key)) continue;
    notes.push(
      `CCC ambient suggestion: ${sig.skill} — ${sig.reason}. ` +
      `If you finish the user's request with room to spare, offer it via AskUserQuestion ` +
      `with options [⭐ Run ${sig.skill}, Dismiss, /ccc-browse] — never a typed-letter list.`
    );
    recordTickerSignalNudge(sig.key);
  }
  return notes;
}

/**
 * suggestions.jsonl producer (CC-1386 W4 item 14 — codex finding 11). Any
 * ticker signal at confidence >= 0.8 also gets appended to Commander Mission
 * Control's suggestions feed so its Suggestions panel has a real producer.
 * Deduped by key: id === sig.key, skipped when ANY suggestion with that id
 * already exists — regardless of status. A dismissed/promoted suggestion must
 * stay dead (appending a fresh creation line would resurrect it in the
 * latest-wins merge); genuinely new situations mint new ids because keys are
 * content-versioned (update-<latest>, stale-telemetry-<weekBucket>).
 * Fails open — a broken producer must never affect the hook chain.
 */
async function produceSuggestion(sig) {
  try {
    const existing = await readSuggestions();
    if (existing.some(s => s.id === sig.key)) return;
    await appendSuggestion({
      id: sig.key,
      from: 'suggest-ticker',
      idea: sig.reason,
      evidence: sig.skill,
    });
  } catch { /* fail-open */ }
}

function readNudgeState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function sessionKeyFrom(payload) {
  const sid = (payload && typeof payload.session_id === 'string' && payload.session_id)
    || process.env.CLAUDE_SESSION_ID
    || '';
  // No session id available → fall back to a daily key so the nudge still
  // re-arms instead of firing every turn or never again.
  return sid || `unknown-${new Date().toISOString().slice(0, 10)}`;
}

function seenThisSession(file, sessionKey) {
  const state = readNudgeState(file);
  return Boolean(state && state.sessionKey === sessionKey);
}

function recordNudge(file, data = {}) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...data, ts: Date.now() }));
}

/**
 * Proactivity wave (v6.8.0 — CCC thinking one step ahead). Four signals,
 * evaluated in priority order; returns AT MOST ONE candidate per turn as
 * { note, record } — record() persists the anti-nag marker and is called by
 * main() only when the note actually ships, so a candidate deferred behind a
 * higher-priority note can still fire on a later turn. Respects
 * CCC_SUGGEST_DISABLE. Every branch fails open.
 */
export function maybeProactivityWave(promptText, payload = {}) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') return null;
  const sessionKey = sessionKeyFrom(payload);

  // 1. Mission-control: ≥2 agents in flight OR ≥3 open tasks (30-min window).
  try {
    if (!seenThisSession(MC_NUDGE_SEEN_FILE, sessionKey) &&
        (countAgentsInFlight() >= 2 || countActiveTasks() >= 3)) {
      return {
        note: '🎛️ Multiple agents in flight — open /ccc-mission-control to see who\'s doing what.',
        record: () => recordNudge(MC_NUDGE_SEEN_FILE, { sessionKey }),
      };
    }
  } catch { /* fail-open */ }

  // 2. Metric-loop: measurable goal in the prompt → /ccc-loop scoreboard.
  try {
    if (detectMetricLoopSignal(promptText) && !seenThisSession(METRIC_LOOP_SEEN_FILE, sessionKey)) {
      return {
        note: '🔁 That\'s a measurable goal — /ccc-loop can iterate against a scoreboard until it\'s hit.',
        record: () => recordNudge(METRIC_LOOP_SEEN_FILE, { sessionKey }),
      };
    }
  } catch { /* fail-open */ }

  // 3. Vague prompt: short + unspecific ask → /ccc-prompt-fix sharpener.
  try {
    if (detectVaguePrompt(promptText) && !seenThisSession(VAGUE_PROMPT_SEEN_FILE, sessionKey)) {
      return {
        note: '🎯 Vague ask — /ccc-prompt-fix can sharpen this into a prompt that gets the result you actually want.',
        record: () => recordNudge(VAGUE_PROMPT_SEEN_FILE, { sessionKey }),
      };
    }
  } catch { /* fail-open */ }

  // 4. Tool failures: ≥3 failed calls in 10 min → debugging beats retrying.
  //    Time-based dedup (30-min cooldown) rather than per-session.
  try {
    const seen = readNudgeState(TOOL_FAILURES_SEEN_FILE);
    const cooled = !seen || !Number.isFinite(seen.ts) || Date.now() - seen.ts >= TOOL_FAILURE_COOLDOWN_MS;
    if (cooled && countRecentToolFailures() >= 3) {
      return {
        note: '🐛 Several tool calls failing — /ccc-debug or a systematic-debugging pass beats retrying.',
        record: () => recordNudge(TOOL_FAILURES_SEEN_FILE),
      };
    }
  } catch { /* fail-open */ }

  return null;
}

async function main(payload = {}) {
  if (process.env.CCC_SUGGEST_DISABLE === '1') {
    return emitSilent();
  }

  const modelNotes = [];
  const cwd = resolveCwd(payload);
  const stateFile = projectStateFile(cwd);

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

  // Proactive isolation-spawn nudge — offer to spin isolated/parallel work
  // into its own session (spawn_task chip in Cowork / /spawn in CLI).
  try {
    const spawnNudge = maybeSpawnNudge(promptText);
    if (spawnNudge) modelNotes.push(spawnNudge);
  } catch { /* fail-open — never break the hook chain */ }

  try {
    fs.mkdirSync(projectDir(cwd), { recursive: true });
  } catch {}

  let lastState = null;
  try {
    lastState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {}

  // PM loop nudge — once per session/day, never repeated. Fail-open.
  try {
    const loopNudge = maybeLoopNudge(lastState, cwd);
    if (loopNudge) modelNotes.push(loopNudge);
  } catch { /* fail-open — never break the hook chain */ }

  // Proactivity wave — mission-control / metric-loop / vague-prompt /
  // tool-failure signals. Ranks BELOW every existing signal (including the
  // SCOPE/AUDIT-class ambient suggestion added later): the note ships only
  // when nothing above fired this turn, capping wave suggestions at 1/turn.
  // Dedup markers are written only on actual ship (see maybeProactivityWave).
  let waveCandidate = null;
  try { waveCandidate = maybeProactivityWave(promptText, payload); } catch { /* fail-open */ }
  const appendWaveNote = () => {
    if (!waveCandidate || modelNotes.length > 0) return;
    modelNotes.push(waveCandidate.note);
    try { waveCandidate.record(); } catch { /* fail-open */ }
  };

  if (!shouldRun(lastState)) {
    appendWaveNote();
    if (modelNotes.length) return emitModel('UserPromptSubmit', modelNotes.join('\n'));
    return emitSilent();
  }

  const state = computeState(promptText, cwd);

  // New ticker signals (CC-1386 W4 item 13) — update-available / stale-telemetry.
  // Folded onto state.tickerSuggestions so suggest-lightweight.js's independent
  // computeConfidence() pass picks them up too (same involvement/dismissal
  // machinery as every other suggestion — see suggest-lightweight.js).
  let tickerSignals = [];
  try { tickerSignals = computeTickerSignals(); } catch { /* fail-open */ }
  state.tickerSuggestions = tickerSignals.map(({ skill, reason, confidence }) => ({ skill, reason, confidence }));

  // Persist
  try {
    const tmp = stateFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, stateFile);
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

  // New ticker signals — model-facing nudge (own anti-nag, see
  // maybeTickerSignalNotes) PLUS the mission-control/suggestions.jsonl
  // producer (CC-1386 W4 item 14) for every candidate ≥0.8 confidence,
  // regardless of whether the chat nudge fired this turn — Mission Control's
  // history should reflect the fact even when the chat note is cooling down.
  try {
    for (const note of maybeTickerSignalNotes(state, tickerSignals)) modelNotes.push(note);
  } catch { /* fail-open */ }
  for (const sig of tickerSignals) {
    if (sig.confidence >= 0.8) {
      try { await produceSuggestion(sig); } catch { /* fail-open */ }
    }
  }

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

  appendWaveNote();
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
      const result = await main(payload);
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
