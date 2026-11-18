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
 * State is keyed by the stdin session_id so parallel sessions never share or
 * clobber each other's counters. session-save.js and cost-ceiling-enforcer.js
 * read/clean the same session-keyed file. Parallel tool calls in ONE session
 * run this hook concurrently, so the increment is a locked read-modify-write
 * with a temp-file rename (lib/atomic-json.mjs, Codex audit #26).
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser, emitSilent } from './lib/emit.mjs';
import { readStdinJson, sessionKey } from './lib/session-key.mjs';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { updateJson } from './lib/atomic-json.mjs';
import { isMainModule } from './lib/code-mode.mjs';

const SESSIONS_DIR = join(stateDir(), 'sessions');

// Budget-unit conversion: 1 tool call == $0.01 budget unit. NOT real dollars.
const UNIT_PER_CALL = 0.01;
const ALERT_CALLS = 1000;  // "~$10"
const WARN_CALLS = 700;    // "~$7"

export async function run(input = {}) {
  let out = { continue: true, suppressOutput: true };
  try {
    const SESSION_KEY = sessionKey(input);
    const COST_FILE = join(SESSIONS_DIR, `active-cost-${SESSION_KEY}.json`);
    const { value: costData } = await updateJson(COST_FILE, (current) => {
      const toolCalls = (Number.isFinite(current.toolCalls) ? current.toolCalls : 0) + 1;
      return { ...current, toolCalls, estimatedCost: toolCalls * UNIT_PER_CALL };
    }, { fallback: () => ({ toolCalls: 0, estimatedCost: 0, sessionId: SESSION_KEY, startedAt: new Date().toISOString() }) });

    if (costData.toolCalls > ALERT_CALLS) {
      out = emitUser(
        `CCC tool-call budget alert: ${costData.toolCalls} calls this session (budget unit ~$${costData.estimatedCost.toFixed(2)} at $0.01/call — not real spend) — consider wrapping up`
      );
    } else if (costData.toolCalls > WARN_CALLS) {
      out = emitUser(
        `CCC tool-call budget warning: ${costData.toolCalls} calls this session (budget unit ~$${costData.estimatedCost.toFixed(2)})`
      );
    } else {
      out = emitSilent();
    }
  } catch {
    out = { continue: true, suppressOutput: true };
  }

  track('hook_fired', { hook: 'PreToolUse', handler: 'cost-tracker' });
  return out;
}

// Standalone entry (hooks.json may still call this file directly); the PreToolUse dispatcher imports run() instead.
if (isMainModule(import.meta.url)) {
  readStdinJson().then(run).catch(() => ({ continue: true })).then((out) => {
    process.stdout.write(JSON.stringify(out) + '\n');
  });
}
