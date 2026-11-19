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
 * time and must not crash). Each handler runs under one deadline that covers its import and its run:
 *   cost-tracker and cost-ceiling-enforcer (budget, 1.5 s and 2.5 s): an error or timeout denies the
 *     call when a tool-call ceiling is configured (and CCC_COST_OVERRIDE is not 1), and passes when
 *     none is (the ceiling is off by default). Checking the configuration has its own 500 ms limit.
 *   secret-leak-guard (enforce, 2.5 s): an error or timeout denies a call it scans.
 * The deadlines add up to well under the 8 s hook timeout, and main() exits the process as soon as
 * the answer is written, so work that lost a race cannot hold the process open. Input that is not a
 * JSON object is denied. The subagent router is loaded only for Agent/Task calls, after the decision,
 * and never changes it.
 */
import { readFileSync } from 'node:fs';
import { isMainModule } from '../lib/code-mode.mjs';
import { emitSilent, emitUser, emitDeny } from '../lib/emit.mjs';

const AGENT_TOOLS = new Set(['Agent', 'Task']);
// Mirrors secret-leak-guard's SCANNED_TOOLS, used only when that module cannot be loaded.
const GUARDED = new Set(['Write', 'Edit', 'MultiEdit', 'Bash', 'PowerShell', 'WebSearch', 'apply_patch', 'REPL']);
export const guardCovers = (tool) => GUARDED.has(tool) || String(tool).startsWith('mcp__');

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

const positive = (v) => v !== undefined && String(v).trim() !== '' && Number(v) > 0;

/** Is a tool-call ceiling configured? Read without the enforcer module, for when it failed. */
export async function budgetConfigured(env = process.env) {
  if (env.CCC_COST_OVERRIDE === '1') return false;
  const fromEnv = env.CCC_COST_CEILING !== undefined && String(env.CCC_COST_CEILING).trim() !== ''
    ? env.CCC_COST_CEILING : env.CLAUDE_PLUGIN_OPTION_COST_CEILING;
  if (fromEnv !== undefined && String(fromEnv).trim() !== '') return positive(fromEnv);
  try {
    const { readablePath } = await import(new URL('../../lib/lane-state.js', import.meta.url).href);
    const config = JSON.parse(readFileSync(readablePath('config.json'), 'utf8'));
    return typeof config.costCeiling === 'number' && config.costCeiling > 0;
  } catch (err) {
    // No config file: no ceiling. Anything else (unreadable config, broken module): assume one.
    return err?.code !== 'ENOENT';
  }
}

class Timeout extends Error {}

/** Run fn() but give up after ms, whatever it is doing (import included). */
function withDeadline(fn, ms) {
  let timer;
  return Promise.race([
    Promise.resolve().then(fn),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Timeout(`no answer in ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

async function load(rel, name) {
  const mod = await import(new URL(rel, import.meta.url).href);
  if (typeof mod[name] !== 'function') throw new Error(`${rel} has no ${name}()`);
  return mod[name];
}

// { file } entries, the same shape as the SessionStart orchestrator, so ccc doctor
// counts these handlers as run by this dispatcher.
export const HANDLERS = Object.freeze([
  { name: 'cost-tracker', file: '../cost-tracker.js', role: 'budget', ms: 1500 },
  { name: 'cost-ceiling-enforcer', file: '../cost-ceiling-enforcer.js', role: 'budget', ms: 2500 },
  { name: 'secret-leak-guard', file: '../secret-leak-guard.js', role: 'enforce', ms: 2500 },
]);
const ROUTER = { file: '../subagent-skill-router.js' };

export function mergeOutputs(outputs) {
  const deny = outputs.find((o) => o?.hookSpecificOutput?.permissionDecision === 'deny');
  if (deny) return deny;
  const messages = outputs.map((o) => o?.systemMessage).filter((m) => typeof m === 'string' && m.trim());
  return messages.length ? emitUser(messages.join(' · ')) : emitSilent();
}

async function onFailure(role, tool, name, err) {
  const why = `${name}: ${err?.message || 'error'}`;
  if (role === 'enforce') return guardCovers(tool) ? guardFailed(tool, why) : emitSilent();
  if (role === 'budget') {
    // Unknown (the check itself stalled or failed): treat as configured.
    const configured = await withDeadline(() => budgetConfigured(), 500).catch(() => true);
    return configured ? budgetFailed(why) : emitSilent();
  }
  return emitSilent();
}

export async function dispatch(input, handlers = HANDLERS) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return guardFailed('', 'hook input is not a JSON object');
  const tool = toolOf(input);
  const outputs = [];
  for (const { name, file, role, ms } of handlers) {
    try {
      outputs.push(await withDeadline(async () => (await load(file, 'run'))(input), ms || 2500));
    } catch (err) {
      if (process.env.CCC_ORCH_VERBOSE === '1') process.stderr.write(`pre-tool-use-dispatcher: ${name} failed: ${err?.message}\n`);
      outputs.push(await onFailure(role, tool, name, err));
    }
  }
  const merged = mergeOutputs(outputs);
  // Queue an Agent/Task call's task for the subagent router only once no handler here denied it.
  if (AGENT_TOOLS.has(tool) && merged?.hookSpecificOutput?.permissionDecision !== 'deny') {
    try { await withDeadline(async () => (await load(ROUTER.file, 'recordAgentCall'))(input), 1000); } catch {}
  }
  return merged;
}

/** Strict stdin JSON: anything unparseable becomes null (and is denied), never {}. */
async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

/** Read stdin, answer, and exit at once: nothing left running can delay the exit past the hook timeout. */
export async function main(handlers = HANDLERS) {
  let out;
  try {
    out = await dispatch(await readInput(), handlers);
  } catch (err) {
    out = guardFailed('', err?.message || 'dispatcher error');
  }
  process.stdout.write(JSON.stringify(out) + '\n', () => process.exit(0));
}

if (isMainModule(import.meta.url)) main();
