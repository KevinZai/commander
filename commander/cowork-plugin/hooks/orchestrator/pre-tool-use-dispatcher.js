#!/usr/bin/env node
/**
 * pre-tool-use-dispatcher.js
 *
 * CC-414 for PreToolUse: one Node process runs the three handlers that match every tool call
 * (cost-tracker, cost-ceiling-enforcer, secret-leak-guard) instead of three spawns per call.
 *
 * Why it matters more now: in Claude Code's Code Mode, every tool call made from Claude's JavaScript goes
 * through PreToolUse, and a hook that times out or fails REFUSES the call. Fewer, faster processes means
 * fewer refused calls inside code. https://code.claude.com/docs/en/code-mode
 *
 * Order: cost-tracker counts the call first, so cost-ceiling-enforcer reads the up-to-date count from the
 * same process (the two used to race on one JSON file, Codex audit #26). secret-leak-guard runs last.
 * Merge: the first deny wins and is returned as-is. Otherwise visible messages are joined with " · ";
 * if nobody spoke the output is silent.
 *
 * Failure policy (hooks.json sets onFailure "block" with an 8 s timeout, so this process must answer in
 * time and must not crash). The handlers run in a child process (pre-tool-use-worker.mjs, IPC only); this
 * process only keeps the clock, so a deadline holds even when a handler blocks in synchronous or native
 * code. A handler that misses its deadline gets the child SIGKILLed (never waited for), and the next step
 * gets a fresh child. Each deadline
 * covers the handler's import and its run:
 *   cost-tracker and cost-ceiling-enforcer (budget, 1.5 s and 2.5 s): an error or timeout denies the
 *     call when a tool-call ceiling is configured (and CCC_COST_OVERRIDE is not 1), and passes when
 *     none is (the ceiling is off by default). Checking the configuration has its own 500 ms limit and
 *     counts as configured when it fails.
 *   secret-leak-guard (enforce, 2.5 s): an error or timeout denies a call it scans.
 * Every step is also cut to what is left of a 6.5 s total, and a watchdog answers with a deny at 7.2 s,
 * so the answer always lands inside the hook timeout; a message is capped at 4,000 characters. main()
 * exits 0 only once the answer is fully written (2 otherwise), and the child flushes opted-in telemetry
 * on its own after that. Input that is not a JSON object is denied. The subagent router runs only for
 * Agent/Task calls, after the decision, and never changes it.
 */
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../lib/code-mode.mjs';
import { emitSilent, emitUser, emitDeny } from '../lib/emit.mjs';
import { budgetConfigured } from './budget-config.mjs';

export { budgetConfigured };

const AGENT_TOOLS = new Set(['Agent', 'Task']);
// Mirrors secret-leak-guard's SCANNED_TOOLS, used only when that module cannot be loaded.
const GUARDED = new Set(['Write', 'Edit', 'MultiEdit', 'Bash', 'PowerShell', 'WebSearch', 'apply_patch', 'REPL']);
export const guardCovers = (tool) => GUARDED.has(tool) || String(tool).startsWith('mcp__');

export const TOTAL_MS = 6500;    // all steps together
export const WATCHDOG_MS = 7200; // answer with a deny no later than this
const EXIT_MS = 7600;            // hard exit, telemetry or not (hook timeout is 8 s)

function toolOf(input) {
  return (input && (input.tool_name || input.toolName)) || '';
}

function guardFailed(tool, why) {
  return emitDeny(`CCC SECRET GUARD: could not scan this ${tool || 'tool'} call for secrets (${why}), so it is blocked. ` +
    'Reinstall or update the Commander plugin.');
}

function budgetFailed(why) {
  return emitDeny(`CCC COST CEILING: could not check the tool-call budget (${why}), so this call is blocked. ` +
    'Set CCC_COST_OVERRIDE=1 to continue past the ceiling.');
}

class Timeout extends Error {}

/**
 * Runs tasks in one child process at a time (IPC only; its stdio is ignored, so nothing it starts can hold
 * this hook's stdout open). A task that misses its deadline gets the child SIGKILLed, which works even in a
 * synchronous native call, and this process never waits for a killed child.
 */
export class Runner {
  constructor() { this.child = null; this.seq = 0; this.pending = new Map(); }

  start() {
    // No inherited execArgv (a test preload or --inspect); the child gets this process's env as it is now.
    const c = fork(fileURLToPath(new URL('./pre-tool-use-worker.mjs', import.meta.url)), [],
      { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], execArgv: [], env: { ...process.env } });
    const failAll = (message) => {
      if (this.child === c) this.child = null;
      for (const [id, p] of this.pending) {
        if (p.c !== c) continue;
        this.pending.delete(id);
        p.reject(new Error(message));
      }
    };
    c.on('message', (msg) => {
      const p = msg && this.pending.get(msg.id);
      if (!p || p.c !== c) return;
      this.pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.value); else p.reject(new Error(msg.message));
    });
    c.on('error', (err) => failAll(err?.message || 'worker error'));
    c.on('exit', () => failAll('worker exited'));
    this.child = c;
    return c;
  }

  call(task, ms) {
    const c = this.child || this.start();
    const id = ++this.seq;
    let timer;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, c });
      timer = setTimeout(() => {
        this.pending.delete(id);
        this.kill();
        reject(new Timeout(`no answer in ${ms} ms`));
      }, Math.max(0, ms));
      try { c.send({ id, ...task }); } catch (err) { this.pending.delete(id); reject(err); }
    }).finally(() => clearTimeout(timer));
  }

  static drop(c) {
    try { c.kill('SIGKILL'); } catch {}
    try { c.disconnect(); } catch {}
    c.unref();
  }

  kill() {
    const c = this.child;
    this.child = null;
    if (c) Runner.drop(c);
  }

  /**
   * Done with the child. With flush, it sends any queued opted-in telemetry and exits on its own (it keeps
   * running after this process exits, bounded by telemetry's send timeout); without, it is killed.
   */
  close(flush = false) {
    const c = this.child;
    this.child = null;
    if (!c) return;
    if (!flush) return Runner.drop(c);
    try { c.send({ kind: 'flush' }); } catch {}
    try { c.disconnect(); } catch {}
    c.unref();
  }
}

// { file } entries, the same shape as the SessionStart orchestrator, so ccc doctor
// counts these handlers as run by this dispatcher.
export const HANDLERS = Object.freeze([
  { name: 'cost-tracker', file: '../cost-tracker.js', role: 'budget', ms: 1500 },
  { name: 'cost-ceiling-enforcer', file: '../cost-ceiling-enforcer.js', role: 'budget', ms: 2500 },
  { name: 'secret-leak-guard', file: '../secret-leak-guard.js', role: 'enforce', ms: 2500 },
]);
const ROUTER = { file: '../subagent-skill-router.js' };
const href = (file) => new URL(file, import.meta.url).href;

export const MAX_TEXT = 4000; // characters per message, so the answer stays far below a pipe buffer
const clip = (t) => (typeof t === 'string' && t.length > MAX_TEXT ? t.slice(0, MAX_TEXT - 1) + '…' : t);

export function mergeOutputs(outputs) {
  const deny = outputs.find((o) => o?.hookSpecificOutput?.permissionDecision === 'deny');
  if (deny) {
    const reason = clip(deny.hookSpecificOutput.permissionDecisionReason || deny.systemMessage || 'blocked by a CCC hook');
    return emitDeny(reason);
  }
  const messages = outputs.map((o) => o?.systemMessage).filter((m) => typeof m === 'string' && m.trim());
  return messages.length ? emitUser(clip(messages.join(' · '))) : emitSilent();
}

async function decide(input, handlers, runner, t0) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return guardFailed('', 'hook input is not a JSON object');
  const tool = toolOf(input);
  const left = (ms) => Math.min(ms, TOTAL_MS - (Date.now() - t0));
  let configured; // computed once, only when a budget step fails
  const outputs = [];
  for (const { name, file, role, ms } of handlers) {
    try {
      outputs.push(await runner.call({ kind: 'run', href: href(file), input }, left(ms || 2500)));
    } catch (err) {
      const why = `${name}: ${err?.message || 'error'}`;
      if (process.env.CCC_ORCH_VERBOSE === '1') process.stderr.write(`pre-tool-use-dispatcher: ${why}\n`);
      if (role === 'enforce') {
        outputs.push(guardCovers(tool) ? guardFailed(tool, why) : emitSilent());
      } else if (role === 'budget') {
        if (configured === undefined) configured = await runner.call({ kind: 'budgetConfigured' }, left(500)).catch(() => true);
        outputs.push(configured ? budgetFailed(why) : emitSilent());
      } else {
        outputs.push(emitSilent());
      }
    }
  }
  const merged = mergeOutputs(outputs);
  // Queue an Agent/Task call's task for the subagent router only once no handler here denied it.
  if (AGENT_TOOLS.has(tool) && merged?.hookSpecificOutput?.permissionDecision !== 'deny' && left(1000) > 50) {
    await runner.call({ kind: 'record', href: href(ROUTER.file), input }, left(1000)).catch(() => {});
  }
  return merged;
}

export async function dispatch(input, handlers = HANDLERS) {
  const runner = new Runner();
  try {
    return await decide(input, handlers, runner, Date.now());
  } finally {
    runner.close(false);
  }
}

/** Strict stdin JSON: anything unparseable becomes null (and is denied), never {}. */
async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

/**
 * Read stdin, answer inside the hook timeout, and exit. The exit code is 0 only once the whole answer has
 * been handed to stdout; an answer that could not be delivered by the hard deadline exits 2 (a hook failure,
 * which onFailure "block" turns into a refused call), never a truncated success.
 */
export async function main(handlers = HANDLERS) {
  const t0 = Date.now();
  const runner = new Runner();
  let answered = false;
  let delivered = false;
  let gotInput = false;
  const answer = (out) => {
    if (answered) return false;
    answered = true;
    process.stdout.write(JSON.stringify(out) + '\n', (err) => {
      delivered = !err;
      process.exit(err ? 2 : 0);
    });
    return true;
  };
  setTimeout(() => {
    runner.kill();
    answer(gotInput ? guardFailed('', `no decision in ${WATCHDOG_MS} ms`) : emitDeny(`CCC: the tool call's hook input did not arrive within ${WATCHDOG_MS} ms, so it is blocked.`));
  }, WATCHDOG_MS).unref();
  setTimeout(() => process.exit(delivered ? 0 : 2), EXIT_MS).unref();
  let out;
  try {
    const input = await readInput();
    gotInput = true;
    out = await decide(input, handlers, runner, t0);
  } catch (err) {
    out = guardFailed('', err?.message || 'dispatcher error');
  }
  runner.close(true);
  answer(out);
}

if (isMainModule(import.meta.url)) main();
