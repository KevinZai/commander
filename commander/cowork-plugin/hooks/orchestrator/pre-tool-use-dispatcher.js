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
 * if nobody spoke the output is silent. A handler that throws is treated as a pass (fail open, as before).
 */
import { readStdinJson } from '../lib/session-key.mjs';
import { emitSilent, emitUser } from '../lib/emit.mjs';
import { run as costTracker } from '../cost-tracker.js';
import { run as costCeiling } from '../cost-ceiling-enforcer.js';
import { run as secretGuard } from '../secret-leak-guard.js';
import { recordAgentCall } from '../subagent-skill-router.js';

export const HANDLERS = Object.freeze([
  ['cost-tracker', costTracker],
  ['cost-ceiling-enforcer', costCeiling],
  ['secret-leak-guard', secretGuard],
]);

export function mergeOutputs(outputs) {
  const deny = outputs.find((o) => o?.hookSpecificOutput?.permissionDecision === 'deny');
  if (deny) return deny;
  const messages = outputs.map((o) => o?.systemMessage).filter((m) => typeof m === 'string' && m.trim());
  return messages.length ? emitUser(messages.join(' · ')) : emitSilent();
}

export async function dispatch(input) {
  const outputs = [];
  for (const [name, handler] of HANDLERS) {
    try {
      outputs.push(await handler(input));
    } catch (err) {
      if (process.env.CCC_ORCH_VERBOSE === '1') process.stderr.write(`pre-tool-use-dispatcher: ${name} failed: ${err?.message}\n`);
      outputs.push(emitSilent());
    }
  }
  const merged = mergeOutputs(outputs);
  // Queue an Agent/Task call's task for the subagent router only once no handler here denied it.
  if (merged?.hookSpecificOutput?.permissionDecision !== 'deny') {
    try { recordAgentCall(input); } catch {}
  }
  return merged;
}

readStdinJson()
  .then((input) => dispatch(input || {}))
  .catch(() => ({ continue: true }))
  .then((out) => process.stdout.write(JSON.stringify(out) + '\n'));
