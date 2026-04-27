#!/usr/bin/env node
/**
 * cost-ceiling-enforcer.js
 * Hook: PreToolUse
 * Checks cumulative session cost against costCeiling from config.json.
 * Blocks tool execution with actionable error if ceiling exceeded.
 * Config: ~/.claude/commander/config.json { "costCeiling": 5.00 }
 * Default ceiling: $10.00 (matches existing cost-tracker alert threshold).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const CONFIG_FILE = join(CCC_DIR, 'config.json');
const COST_FILE = join(CCC_DIR, 'sessions', 'active-cost.json');

const DEFAULT_CEILING = 10.00;

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
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

    // Read current session cost
    let currentCost = 0;
    try {
      const costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
      currentCost = costData.estimatedCost || 0;
    } catch {
      // No cost file yet — cost is 0, allow through
    }

    if (currentCost >= ceiling) {
      const stopReason = `CCC cost ceiling reached: $${currentCost.toFixed(2)} >= $${ceiling.toFixed(2)} limit. ` +
        `To continue, raise or remove the ceiling in ~/.claude/commander/config.json ("costCeiling" key), ` +
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
