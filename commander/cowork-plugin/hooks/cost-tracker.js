#!/usr/bin/env node
/**
 * cost-tracker.js
 * Hook: PreToolUse (async)
 *
 * Tracks the session's TOOL-CALL BUDGET. This is an honest activity metric,
 * not real dollars: Claude Code does not expose per-call cost to hooks, so we
 * count tool calls and expose a budget-unit conversion of $0.01/call purely
 * for backwards compatibility ("$10" == 1000 tool calls).
 *
 * State is keyed by CLAUDE_SESSION_ID so parallel sessions never share or
 * clobber each other's counters. session-save.js and cost-ceiling-enforcer.js
 * read/clean the same session-keyed file.
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser, emitSilent } from './lib/emit.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SESSIONS_DIR = join(process.env.HOME, '.claude', 'commander', 'sessions');
const SESSION_KEY = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
const COST_FILE = join(SESSIONS_DIR, `active-cost-${SESSION_KEY}.json`);

// Budget-unit conversion: 1 tool call == $0.01 budget unit. NOT real dollars.
const UNIT_PER_CALL = 0.01;
const ALERT_CALLS = 1000;  // "~$10"
const WARN_CALLS = 700;    // "~$7"

async function main() {
  try {
    let costData = { toolCalls: 0, estimatedCost: 0, sessionId: SESSION_KEY, startedAt: new Date().toISOString() };
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch {}

    costData.toolCalls++;
    costData.estimatedCost = costData.toolCalls * UNIT_PER_CALL;

    if (!existsSync(SESSIONS_DIR)) await mkdir(SESSIONS_DIR, { recursive: true });
    await writeFile(COST_FILE, JSON.stringify(costData, null, 2));

    if (costData.toolCalls > ALERT_CALLS) {
      console.log(JSON.stringify(emitUser(
        `CCC tool-call budget alert: ${costData.toolCalls} calls this session (budget unit ~$${costData.estimatedCost.toFixed(2)} at $0.01/call — not real spend) — consider wrapping up`
      )));
    } else if (costData.toolCalls > WARN_CALLS) {
      console.log(JSON.stringify(emitUser(
        `CCC tool-call budget warning: ${costData.toolCalls} calls this session (budget unit ~$${costData.estimatedCost.toFixed(2)})`
      )));
    } else {
      console.log(JSON.stringify(emitSilent()));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }

  track('hook_fired', { hook: 'PreToolUse', handler: 'cost-tracker' });
}

main();
