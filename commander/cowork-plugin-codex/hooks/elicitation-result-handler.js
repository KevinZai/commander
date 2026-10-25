#!/usr/bin/env node
/**
 * elicitation-result-handler.js
 * Hook: ElicitationResult
 * Logs the user's response (accept/decline/cancel, the documented top-level
 * `action`) best-effort. `content` holds the form values and is not logged. Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const LOG_DIR = stateDir();
const LOG_FILE = path.join(LOG_DIR, 'elicitation.jsonl');

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
    const action = ['accept', 'decline', 'cancel'].includes(input.action) ? input.action : 'unknown';

    const entry = {
      ts: new Date().toISOString(),
      event: 'ElicitationResult',
      mcp_server_name: input.mcp_server_name || null,
      mode: input.mode || null,
      elicitation_id: input.elicitation_id || null,
      action,
    };
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort logging — never fail the session
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
