#!/usr/bin/env node
/**
 * session-start-orchestrator.js
 *
 * CC-414 hook chain merge — single-process SessionStart orchestrator.
 *
 * Replaces 3 separate Node.js spawns (session-start.js +
 * stale-claude-md-nudge.js + post-compact-recovery.js) with one process
 * that imports each handler's run() function and aggregates their output.
 *
 * Estimated savings: ~150ms × 2 spawns avoided = ~300ms per session start
 * (Node.js cold start dominates; actual handler logic is sub-millisecond).
 *
 * Status: SCAFFOLD ONLY — not active until hooks.json is flipped.
 * See ./README.md for activation steps + rollback.
 */
import { track } from '../../lib/telemetry.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HOOKS_DIR = join(__dirname, '..');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Merge handler outputs into a single response using ONLY documented fields
 * (see hooks/lib/emit.mjs — the hook output contract):
 *  - If any handler returns continue:false OR a stopReason, short-circuit.
 *  - User-facing messages (systemMessage, plus legacy status for safety)
 *    concatenate with " · " into a single systemMessage.
 *  - Model-facing context (hookSpecificOutput.additionalContext) concatenates
 *    with blank lines; user messages are mirrored into it so the model can
 *    act on what the user was told (both-channels delivery).
 *  - suppressOutput is true only if ALL handlers requested it AND there is
 *    nothing user-facing to show.
 */
function mergeResponses(responses) {
  let continueFlag = true;
  let stopReason;
  const messages = [];
  const contexts = [];
  let suppressOutput = true;
  let anyExplicitShow = false;

  for (const r of responses) {
    if (!r || typeof r !== 'object') continue;
    if (r.continue === false) {
      continueFlag = false;
      if (r.stopReason) stopReason = r.stopReason;
    }
    if (r.systemMessage && typeof r.systemMessage === 'string') messages.push(r.systemMessage);
    // Legacy `status` tolerated from stragglers — promoted to systemMessage.
    else if (r.status && typeof r.status === 'string') messages.push(r.status);
    const ctx = r.hookSpecificOutput?.additionalContext;
    if (ctx && typeof ctx === 'string') contexts.push(ctx);
    if (r.suppressOutput === false) anyExplicitShow = true;
    if (r.suppressOutput !== true) suppressOutput = false;
  }
  if (anyExplicitShow || messages.length) suppressOutput = false;

  const out = { continue: continueFlag };
  if (!continueFlag && stopReason) out.stopReason = stopReason;
  if (messages.length) out.systemMessage = messages.join(' · ');
  const mergedContext = [...contexts, ...messages].join('\n\n');
  if (mergedContext) {
    out.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext: mergedContext,
    };
  }
  if (suppressOutput) out.suppressOutput = true;
  return out;
}

async function main() {
  const t0 = Date.now();
  const input = await readStdin();
  const responses = [];
  let shortCircuit = null;

  // Sequence: session-start (state init must run first) → stale-claude-md → post-compact
  // NOTE: session-start remains in _archive/ (orchestrator-compatible, no live twin).
  // stale-claude-md-nudge and post-compact-recovery are dual-mode files that live in
  // hooks/ — they export run() for the orchestrator AND run standalone via CLI tail
  // (InstructionsLoaded and PostCompact hooks respectively).
  const handlers = [
    { name: 'session-start', file: '../_archive/session-start.js' },
    { name: 'stale-claude-md-nudge', file: '../stale-claude-md-nudge.js' },
    { name: 'post-compact-recovery', file: '../post-compact-recovery.js' },
    { name: 'fable-armed-nudge', file: '../fable-armed-nudge.js' },
    { name: 'voice-injector', file: '../voice-injector.js' },
  ];

  for (const h of handlers) {
    try {
      const mod = await import(join(__dirname, h.file));
      if (typeof mod.run !== 'function') continue;
      const r = await mod.run({ input, env: process.env, cwd: process.cwd() });
      responses.push(r);
      if (r && r.continue === false) {
        shortCircuit = r;
        break;
      }
    } catch (err) {
      if (process.env.CCC_ORCH_VERBOSE === '1') {
        process.stderr.write(`[orchestrator] ${h.name} failed: ${err.message}\n`);
      }
    }
  }

  const merged = shortCircuit ? shortCircuit : mergeResponses(responses);
  const elapsed = Date.now() - t0;

  if (process.env.CCC_ORCH_VERBOSE === '1' || process.env.CCC_ORCH_TIMING === '1') {
    process.stderr.write(`[orchestrator] session-start total=${elapsed}ms handlers=${responses.length}\n`);
  }

    track('hook_fired', { hook: 'SessionStart', handler: 'session-start-orchestrator' });


  process.stdout.write(JSON.stringify(merged) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
});
