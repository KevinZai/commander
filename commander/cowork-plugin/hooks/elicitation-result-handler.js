#!/usr/bin/env node
/**
 * elicitation-result-handler.js
 * Hook: ElicitationResult
 * Handles matched/cancelled/declined elicitation results.
 * Logs outcome best-effort. Never blocks — always exits 0 with {continue:true}.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
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
    const result = input.result || {};
    const action = result.matched ? 'matched'
      : result.cancelled ? 'cancelled'
      : result.action === 'cancel' ? 'cancelled'
      : result.action === 'decline' ? 'declined'
      : 'unknown';

    const entry = {
      ts: new Date().toISOString(),
      request_id: input.request_id || null,
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
