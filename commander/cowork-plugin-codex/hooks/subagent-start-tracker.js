#!/usr/bin/env node
/**
 * subagent-start-tracker.js
 * Hook: SubagentStart
 * Logs sub-agent dispatch info (name, prompt, model, session) for observability.
 * Reads from stdin JSON or falls back to env vars. Never blocks.
 */
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'subagent-runs.jsonl');

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
      agent_name: input.agent_name || process.env.CLAUDE_AGENT_NAME || null,
      prompt: input.prompt || process.env.CLAUDE_AGENT_PROMPT || null,
      model: input.model || process.env.CLAUDE_MODEL || null,
      session_id: input.session_id || process.env.CLAUDE_SESSION_ID || null,
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
