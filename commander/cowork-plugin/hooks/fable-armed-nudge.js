#!/usr/bin/env node
/**
 * fable-armed-nudge.js
 * Hook: SessionStart (via orchestrator run() export)
 *
 * Dual-mode: exports run({input,env,cwd}) for the SessionStart orchestrator,
 * and runs standalone via CLI tail when invoked directly.
 *
 * Emits a one-line reminder that the Fable Method doctrine is available and
 * how to self-check it. Always fail-open — never blocks the session start.
 * Respects CCC_FABLE_NUDGE_DISABLE=1.
 */
import { fileURLToPath } from 'node:url';
import { emitUser } from './lib/emit.mjs';

/**
 * Pure-function entry for orchestrator (CC-414).
 * Returns the JSON output object instead of writing to stdout.
 */
export async function run({ env = process.env } = {}) {
  if (env.CCC_FABLE_NUDGE_DISABLE === '1') return { continue: true };
  try {
    return emitUser('Fable Method armed: 12 gates · rules/fable-method.md · /ccc-fable audit to self-check');
  } catch {
    return { continue: true };
  }
}

// CLI tail — only runs when invoked directly, NOT on import (critical: prevents
// stdin hang when the orchestrator dynamically imports this module).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const chunks = []; for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    let input = {}; try { if (raw) input = JSON.parse(raw); } catch {}
    let res; try { res = await run({ input, env: process.env, cwd: process.cwd() }); }
    catch { res = { continue: true, suppressOutput: true }; }
    process.stdout.write(JSON.stringify(res || { continue: true }) + '\n');
  })();
}
