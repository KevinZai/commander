#!/usr/bin/env node
/**
 * task-tracker.js
 * Hook: TaskCreated, TaskCompleted
 * Logs task id and status for session observability.
 * Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'tasks.jsonl');

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
      task_id: input.task_id || input.id || null,
      status: input.status || null,
      title: input.title || null,
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
