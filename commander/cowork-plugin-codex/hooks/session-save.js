#!/usr/bin/env node
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const SESSIONS_DIR = join(process.env.HOME, '.claude', 'commander', 'sessions');
const ACTIVE_FILE = join(SESSIONS_DIR, 'active-session.json');
// Session-keyed tool-call budget file (see cost-tracker.js)
const SESSION_KEY = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
const COST_FILE = join(SESSIONS_DIR, `active-cost-${SESSION_KEY}.json`);

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
      estimatedCost: costData.estimatedCost

    };
      track('hook_fired', { hook: 'Stop', handler: 'session-save' });
    await writeFile(join(SESSIONS_DIR, filename), JSON.stringify(summary, null, 2));

    try { await unlink(ACTIVE_FILE); } catch {}
    try { await unlink(COST_FILE); } catch {}

    console.log(JSON.stringify(emitUser(
      `CCC session saved: ${filename} (${costData.toolCalls} tool calls, budget unit ~$${costData.estimatedCost.toFixed(2)})`
    )));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
