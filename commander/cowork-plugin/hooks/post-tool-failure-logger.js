#!/usr/bin/env node
/**
 * post-tool-failure-logger.js
 * Hook: PostToolUseFailure
 * Logs failed tool name and error for knowledge capture and debugging.
 * Secrets are redacted and long errors clipped before anything is written
 * (hooks/lib/redact-log.mjs); the log is owner-only (file 0600, a state dir
 * this hook creates 0700).
 * Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { redactLogText } from './lib/redact-log.mjs';
import { dropAgentCall } from './subagent-skill-router.js';

const LOG_DIR = stateDir();
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
      tool_name: redactLogText(input.tool_name || input.toolName || null, { max: 200 }),
      error: redactLogText(input.error || input.message || null),
    };
    fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    const fd = fs.openSync(LOG_FILE, 'a', 0o600);
    try {
      try { fs.fchmodSync(fd, 0o600); } catch { /* not ours to chmod, or no POSIX modes */ }
      fs.writeSync(fd, JSON.stringify(entry) + '\n');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Best-effort logging
  }

  // A failed Agent/Task call never starts its subagent: drop its queued task.
  dropAgentCall(input);
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
