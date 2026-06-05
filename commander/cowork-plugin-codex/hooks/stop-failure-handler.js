#!/usr/bin/env node
/**
 * stop-failure-handler.js
 * Hook: StopFailure
 * Logs API errors (rate_limit, billing, auth) for session diagnostics.
 * Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'stop-failures.jsonl');

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
    const entry = {
      ts: new Date().toISOString(),
      error_type: input.error_type || input.type || null,
      message: input.message || input.error || null,
    };
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort logging
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
