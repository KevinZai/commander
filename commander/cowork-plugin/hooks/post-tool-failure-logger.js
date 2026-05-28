#!/usr/bin/env node
/**
 * post-tool-failure-logger.js
 * Hook: PostToolUseFailure
 * Logs failed tool name and error for knowledge capture and debugging.
 * Never blocks — always exits 0 with {continue:true}.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'tool-failures.jsonl');

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
      tool_name: input.tool_name || input.toolName || null,
      error: input.error || input.message || null,
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
