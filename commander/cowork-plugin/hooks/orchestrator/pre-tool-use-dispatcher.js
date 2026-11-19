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
 * Failure policy (hooks.json sets onFailure "block", so this process must not crash or stall on
 * advisory work): every handler is loaded with a dynamic import inside a try, so one broken module
 * cannot stop the others. cost-tracker and cost-ceiling-enforcer are advisory: an error, or taking longer
 * than ADVISORY_MS, counts as a pass. secret-leak-guard is enforcement: if it cannot load or throws on a
 * call it scans, that call is denied. The subagent router is loaded only for Agent/Task calls and never
 * affects the decision.
 */
import { readStdinJson } from '../lib/session-key.mjs';
import { isMainModule } from '../lib/code-mode.mjs';
import { emitSilent, emitUser, emitDeny } from '../lib/emit.mjs';

const ADVISORY_MS = 2500;
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

function withDeadline(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => { timer = setTimeout(() => resolve(emitSilent()), ms); }),
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
  { name: 'cost-tracker', file: '../cost-tracker.js', role: 'advisory' },
  { name: 'cost-ceiling-enforcer', file: '../cost-ceiling-enforcer.js', role: 'advisory' },
  { name: 'secret-leak-guard', file: '../secret-leak-guard.js', role: 'enforce' },
]);
const ROUTER = { file: '../subagent-skill-router.js' };

export function mergeOutputs(outputs) {
  const deny = outputs.find((o) => o?.hookSpecificOutput?.permissionDecision === 'deny');
  if (deny) return deny;
  const messages = outputs.map((o) => o?.systemMessage).filter((m) => typeof m === 'string' && m.trim());
  return messages.length ? emitUser(messages.join(' · ')) : emitSilent();
}

export async function dispatch(input, handlers = HANDLERS) {
  const tool = toolOf(input);
  const outputs = [];
  for (const { name, file, role } of handlers) {
    try {
      const handler = await load(file, 'run');
      const out = handler(input);
      outputs.push(role === 'advisory' ? await withDeadline(Promise.resolve(out), ADVISORY_MS) : await out);
    } catch (err) {
      if (process.env.CCC_ORCH_VERBOSE === '1') process.stderr.write(`pre-tool-use-dispatcher: ${name} failed: ${err?.message}\n`);
      outputs.push(role === 'enforce' && guardCovers(tool) ? guardFailed(tool, `${name}: ${err?.message || 'error'}`) : emitSilent());
    }
  }
  const merged = mergeOutputs(outputs);
  // Queue an Agent/Task call's task for the subagent router only once no handler here denied it.
  if (AGENT_TOOLS.has(tool) && merged?.hookSpecificOutput?.permissionDecision !== 'deny') {
    try { (await load(ROUTER.file, 'recordAgentCall'))(input); } catch {}
  }
  return merged;
}

if (isMainModule(import.meta.url)) {
  readStdinJson()
    .then((input) => dispatch(input || {}))
    .catch((err) => guardFailed('', err?.message || 'dispatcher error'))
    .then((out) => process.stdout.write(JSON.stringify(out) + '\n'));
}
