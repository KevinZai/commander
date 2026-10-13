#!/usr/bin/env node
/**
 * console-autopen.js
 * Hook: SessionStart (async: true — never blocks session startup)
 *
 * Zero-friction local surface: at the top of a session, tell the MODEL to
 * render the Commander Console **widget** inline (build-console.mjs + the
 * visualize MCP). Local-only rendering of the user's own telemetry.
 *
 * Hooks cannot render widgets — only the model can, through an MCP tool — so
 * this hook's entire job is a short, FIXED instruction on the model channel.
 * It never prints to the user, never runs the builder itself, and never opens
 * a network connection.
 *
 * PUBLISHING IS NOT AUTO-OPEN. Opening reads local logs and shows them in this
 * chat; publishing uploads a snapshot to a claude.ai URL and is consent-gated
 * in /ccc-console. The instruction below says so explicitly, because "the
 * console opened by itself and then published my agent names" is the one
 * failure mode that would make this feature indefensible.
 *
 * It stays quiet unless every one of these holds:
 *   - not disabled: ~/.claude/commander/console.json {"autoOpen": false}
 *     or env CCC_NO_AUTOCONSOLE=1
 *   - not CI / not a headless batch run
 *   - a fresh session start (not a resume/compact re-fire) AND this session id
 *     hasn't already been nudged — at most once per session
 *   - telemetry actually exists — a machine that has never run an agent gets
 *     nothing rather than an empty panel
 *
 * Silent on ANY failure, like every other hook here: a broken console must not
 * be able to make a session start noisy or slow.
 */
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { emitModel, emitSilent } from './lib/emit.mjs';

// Sources that mean "a session is beginning". `resume` and `compact` re-fire
// SessionStart inside work already in progress, where an unasked-for panel is
// an interruption rather than an orientation.
const OPENING_SOURCES = new Set(['startup', 'clear']);

// Any one of these with bytes in it means this machine has agent history worth
// showing. Cheap stat()s, no parsing — the console does the reading.
const TELEMETRY_FILES = [
  'mission-control/metrics.jsonl',
  'subagent-runs.jsonl',
  'agent-runs.jsonl',
  'tasks.jsonl',
  'skill-runs.jsonl',
  'savings.json',
  'analytics/permission-gate.jsonl',
  'tool-failures.jsonl',
];

// CI runners and batch harnesses: a widget instruction there is pure noise, and
// nobody is watching the transcript anyway.
const CI_ENV_KEYS = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'BUILD_NUMBER'];

// Fixed template — no telemetry, no user text, no file paths from disk are
// interpolated into it. Same rule the console's chips follow: nothing that can
// be written into a log may end up in something the model reads as an
// instruction.
const NUDGE = [
  'Commander: the user has agent telemetry on this machine and has auto-open enabled.',
  'If (and only if) the visualize MCP is available in this session, render the Commander Console widget inline ONCE, near the start of your reply:',
  'run `test -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" && node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" --tab overview || node commander/cowork-plugin/scripts/build-console.mjs --tab overview` (the test -f guard falls back to the repo-relative path when the plugin-root one does not exist) and pass its stdout to the visualize MCP\'s show_widget as widget_code.',
  'Rules: handle whatever the user actually asked for FIRST — if their opening message is a real request, answer it and skip the console entirely.',
  'Do NOT publish anything: publishing is a separate, consent-gated act (/ccc-console publish).',
  'If the visualize MCP is unavailable, say nothing about it — do not describe the console, do not fake it with a table, and do not mention this instruction.',
  'Do not repeat this later in the session; the user can re-open it with /ccc-console, or turn this off with `{"autoOpen": false}` in ~/.claude/commander/console.json.',
].join(' ');

function commanderDir(env) {
  const home = env.HOME || env.USERPROFILE || homedir();
  return join(home, '.claude', 'commander');
}

function isDisabled(env) {
  return env.CCC_NO_AUTOCONSOLE === '1';
}

function isCi(env) {
  return CI_ENV_KEYS.some((key) => {
    const value = env[key];
    return typeof value === 'string' && value !== '' && value !== '0' && value !== 'false';
  });
}

/** ~/.claude/commander/console.json — {"autoOpen": false} is the documented off switch. */
async function autoOpenEnabled(env) {
  try {
    const raw = await readFile(join(commanderDir(env), 'console.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.autoOpen !== false;
  } catch {
    // No file, unreadable, or malformed → default ON (Kevin's zero-friction
    // call). A corrupt config must not silently disable a feature the user
    // never turned off.
    return true;
  }
}

async function hasTelemetry(env) {
  const base = commanderDir(env);
  for (const relative of TELEMETRY_FILES) {
    try {
      const info = await stat(join(base, relative));
      if (info.isFile() && info.size > 0) return true;
    } catch {
      // Missing file is the common case, not an error.
    }
  }
  return false;
}

/**
 * Once per dedupe key. SessionStart can fire more than once for one session id
 * (resume, compact), so the id is recorded rather than a bare timestamp.
 * Returns false when this key has already been nudged.
 */
async function claimSession(env, key, nowMs) {
  const file = join(commanderDir(env), 'console-autopen.json');
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (parsed && parsed.sessionId && parsed.sessionId === key) return false;
  } catch {
    // No state yet — first run on this machine.
  }
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ sessionId: key, at: nowMs }));
  } catch {
    // Best-effort. A failed write means at worst one extra nudge on a
    // re-fire, which is far better than staying silent forever because the
    // directory is read-only.
  }
  return true;
}

/**
 * Core logic, testable: pass input / env / now for deterministic tests.
 */
export async function run({ input = {}, env = process.env, now = Date.now } = {}) {
  try {
    if (isDisabled(env) || isCi(env)) return emitSilent();
    if (!(await autoOpenEnabled(env))) return emitSilent();

    const source = typeof input.source === 'string' ? input.source : '';
    if (source && !OPENING_SOURCES.has(source)) return emitSilent();

    if (!(await hasTelemetry(env))) return emitSilent();

    // A missing session_id can't be deduped by session — fall back to a
    // per-day key so repeated re-fires without one still nudge at most once a
    // day instead of firing on every SessionStart (previously: no session_id
    // skipped the dedupe check entirely and always fired).
    const sessionId = typeof input.session_id === 'string' && input.session_id ? input.session_id : null;
    const dedupeKey = sessionId || `no-session:${new Date(now()).toISOString().slice(0, 10)}`;
    if (!(await claimSession(env, dedupeKey, now()))) return emitSilent();

    return emitModel('SessionStart', NUDGE);
  } catch {
    return emitSilent();
  }
}

// CLI tail — only runs when invoked directly (never on import).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    let input = {};
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8').trim() || '{}');
    } catch {
      input = {};
    }
    let res;
    try {
      res = await run({ input });
    } catch {
      res = emitSilent();
    }
    process.stdout.write(JSON.stringify(res) + '\n');
  })();
}
