#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SESSIONS_DIR = join(process.env.HOME, '.claude', 'commander', 'sessions');
const COST_FILE = join(SESSIONS_DIR, 'active-cost.json');

async function main() {
  try {
    const licenseFile = join(process.env.HOME, '.claude', 'commander', 'license.json');
    let tier = 'free';
    try {
      const license = JSON.parse(await readFile(licenseFile, 'utf8'));
      if (license.key && license.expires && new Date(license.expires) > new Date()) {
        tier = license.tier || 'pro';
      }
    } catch {}

    if (tier === 'free') {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    let costData = { toolCalls: 0, estimatedCost: 0, startedAt: new Date().toISOString() };
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch {}

    costData.toolCalls++;
    costData.estimatedCost = costData.toolCalls * 0.01;

    if (!existsSync(SESSIONS_DIR)) await mkdir(SESSIONS_DIR, { recursive: true });
    await writeFile(COST_FILE, JSON.stringify(costData, null, 2));

    if (costData.estimatedCost > 10) {
      console.log(JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: `CCC cost alert: ~$${costData.estimatedCost.toFixed(2)} (${costData.toolCalls} tool calls) — consider wrapping up`,
      }));
    } else if (costData.estimatedCost > 7) {
      console.log(JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: `CCC cost warning: ~$${costData.estimatedCost.toFixed(2)} (${costData.toolCalls} tool calls)`,
      }));
    } else {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
