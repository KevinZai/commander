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
 * Merge handler outputs into a single response.
 * Strategy:
 *  - If any handler returns continue:false OR a stopReason, short-circuit.
 *  - Otherwise concatenate non-empty status strings with " · " separator.
 *  - suppressOutput is true only if ALL handlers requested it.
 */
function mergeResponses(responses) {
  let continueFlag = true;
  let stopReason;
  const statuses = [];
  let suppressOutput = true;
  let anyExplicitShow = false;

  for (const r of responses) {
    if (!r || typeof r !== 'object') continue;
    if (r.continue === false) {
      continueFlag = false;
      if (r.stopReason) stopReason = r.stopReason;
    }
    if (r.status && typeof r.status === 'string') statuses.push(r.status);
    if (r.suppressOutput === false) anyExplicitShow = true;
    if (r.suppressOutput !== true) suppressOutput = false;
  }
  if (anyExplicitShow) suppressOutput = false;

  const out = { continue: continueFlag };
  if (!continueFlag && stopReason) out.stopReason = stopReason;
  if (statuses.length) out.status = statuses.join(' · ');
  if (suppressOutput) out.suppressOutput = true;
  return out;
}

async function main() {
  const t0 = Date.now();
  const input = await readStdin();
  const responses = [];
  let shortCircuit = null;

  // Sequence: session-start (state init must run first) → stale-claude-md → post-compact
  const handlers = [
    { name: 'session-start', file: '../session-start.js' },
    { name: 'stale-claude-md-nudge', file: '../stale-claude-md-nudge.js' },
    { name: 'post-compact-recovery', file: '../post-compact-recovery.js' },
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

  process.stdout.write(JSON.stringify(merged) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
});
