#!/usr/bin/env node
/**
 * elicitation-logger.js
 * Hook: Elicitation
 * Logs elicitation requests to ~/.claude/commander/logs/elicitations.jsonl
 * Never blocks — no-op on any failure.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const LOGS_DIR = join(CCC_DIR, 'logs');
const ELICITATIONS_FILE = join(LOGS_DIR, 'elicitations.jsonl');

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    // malformed input — continue
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
      requestId: input.request_id || input.requestId || null,
      prompt: input.prompt || input.message || null,
      type: input.type || null,
    };
    await appendFile(ELICITATIONS_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // fail silently — never block session
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
