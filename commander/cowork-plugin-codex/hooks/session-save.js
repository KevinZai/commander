#!/usr/bin/env node
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const SESSIONS_DIR = join(process.env.HOME, '.claude', 'commander', 'sessions');
const ACTIVE_FILE = join(SESSIONS_DIR, 'active-session.json');
const COST_FILE = join(SESSIONS_DIR, 'active-cost.json');

async function main() {
  try {
    if (!existsSync(SESSIONS_DIR)) await mkdir(SESSIONS_DIR, { recursive: true });

    let session = {};
    try {
      session = JSON.parse(await readFile(ACTIVE_FILE, 'utf8'));
    } catch {}

    let costData = { toolCalls: 0, estimatedCost: 0 };
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch {}

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const shortId = randomBytes(4).toString('hex');
    const filename = `${dateStr}-${shortId}.json`;

    const summary = {
      ...session,
      status: 'complete',
      completedAt: now.toISOString(),
      toolCalls: costData.toolCalls,
      estimatedCost: costData.estimatedCost,
    };

    await writeFile(join(SESSIONS_DIR, filename), JSON.stringify(summary, null, 2));

    try { await unlink(ACTIVE_FILE); } catch {}
    try { await unlink(COST_FILE); } catch {}

    const status = `CCC session saved: ${filename} (${costData.toolCalls} tool calls, ~$${costData.estimatedCost.toFixed(2)})`;
    console.log(JSON.stringify({ continue: true, suppressOutput: false, status }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
