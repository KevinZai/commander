#!/usr/bin/env node
/**
 * cost-ceiling-enforcer.js
 * Hook: PreToolUse
 *
 * Enforces the session TOOL-CALL BUDGET ceiling (see cost-tracker.js — this
 * is an activity metric, not real dollars; "$10" == 1000 tool calls at the
 * $0.01/call budget-unit conversion).
 *
 * Behavior: warn-then-block.
 *   1st crossing → visible warning ("next tool call will be blocked").
 *   After that   → blocks with continue:false, UNLESS CCC_COST_OVERRIDE=1.
 *
 * Config: ~/.claude/commander/config.json { "costCeiling": 5.00 } (budget
 * units — 5.00 == 500 tool calls). Default ceiling: 10.00 (1000 calls).
 * State is keyed by CLAUDE_SESSION_ID (shared with cost-tracker.js).
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const CONFIG_FILE = join(CCC_DIR, 'config.json');
const SESSION_KEY = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
const COST_FILE = join(CCC_DIR, 'sessions', `active-cost-${SESSION_KEY}.json`);

const DEFAULT_CEILING = 10.00; // budget units == 1000 tool calls
// /loop note: rapid /loop iterations burn tool calls fast — raise costCeiling
// in ~/.claude/commander/config.json or set CCC_COST_OVERRIDE=1 for the run.

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PreToolUse', handler: 'cost-ceiling-enforcer' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    // Explicit override — always allow, stay silent
    if (process.env.CCC_COST_OVERRIDE === '1') {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Read configured ceiling
    let ceiling = DEFAULT_CEILING;
    try {
      const config = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
      if (typeof config.costCeiling === 'number' && config.costCeiling > 0) {
        ceiling = config.costCeiling;
      }
    } catch {
      // No config file — use default
    }

    // Read current session budget (session-keyed file from cost-tracker.js)
    let costData = null;
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch {
      // No cost file yet — budget is 0, allow through
    }
    const currentCost = costData?.estimatedCost || 0;

    if (currentCost >= ceiling) {
      const ceilingCalls = Math.round(ceiling / 0.01);

      // Warn-then-block: first crossing emits a visible warning and lets the
      // call through; every subsequent call blocks until override/raise.
      if (costData && !costData.ceilingWarnedAt) {
        costData.ceilingWarnedAt = new Date().toISOString();
        try { await writeFile(COST_FILE, JSON.stringify(costData, null, 2)); } catch {}
        process.stdout.write(JSON.stringify(emitUser(
          `⚠️ CCC tool-call budget ceiling reached: ${costData.toolCalls} calls >= ${ceilingCalls}-call limit ` +
          `(budget unit $${ceiling.toFixed(2)}, not real spend). The NEXT tool call will be blocked — ` +
          `set CCC_COST_OVERRIDE=1 or raise "costCeiling" in ~/.claude/commander/config.json to continue.`
        )) + '\n');
        return;
      }

      const stopReason = `CCC tool-call budget ceiling: ${Math.round(currentCost / 0.01)} calls >= ${ceilingCalls}-call limit ` +
        `(budget units $${currentCost.toFixed(2)} >= $${ceiling.toFixed(2)} — an activity metric, not real spend). ` +
        `To continue: set CCC_COST_OVERRIDE=1, raise/remove "costCeiling" in ~/.claude/commander/config.json, ` +
        `or start a new session.`;

      process.stdout.write(JSON.stringify({
        continue: false,
        stopReason,
      }) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // Fail open — never block on error
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
