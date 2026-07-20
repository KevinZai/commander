#!/usr/bin/env node
/**
 * task-tracker.js
 * Hook: TaskCreated, TaskCompleted
 * Logs task id, status, subject, and session for observability
 * (Mission Control reads this feed). `title` stays — external readers
 * may exist.
 * Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'tasks.jsonl');
const TEXT_MAX = 200;
const STDIN_MAX_BYTES = 256 * 1024;

function redact(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/\b(basic)\s+([A-Za-z0-9+/]{4,}={0,2})/gi, (match, scheme, b64) => {
      try {
        return Buffer.from(b64, 'base64').toString('utf8').includes(':') ? `${scheme} [redacted]` : match;
      } catch {
        return match;
      }
    })
    .replace(/(authorization\s*[=:]\s*)(?:bearer|digest|negotiate|token)\s+[^\s"']+/gi, '$1[redacted]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[redacted]')
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, '[redacted]')
    .replace(/hf_[A-Za-z0-9]{16,}/g, '[redacted]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(
      /((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[=:]\s*)\S+/gi,
      '$1[redacted]'
    );
}

function sanitizeText(value) {
  const redacted = redact(value);
  if (redacted === null) return null;
  const trimmed = redacted.trim();
  if (!trimmed) return null;
  return trimmed.length > TEXT_MAX ? trimmed.slice(0, TEXT_MAX) : trimmed;
}

async function main() {
  let input = {};
  try {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of process.stdin) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > STDIN_MAX_BYTES) {
        process.stdout.write(JSON.stringify({ continue: true }) + '\n');
        return;
      }
      chunks.push(buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    // TaskCreated nests the human fields under `task_input` (title/description);
    // `status` isn't assigned yet at creation (only TaskCompleted carries it),
    // so a null status there is honest, not a bug. Fall back to the flat keys
    // for TaskCompleted / other shapes.
    const taskInput =
      input.task_input && typeof input.task_input === 'object' ? input.task_input : {};
    const title = sanitizeText(input.title) || sanitizeText(taskInput.title);
    const entry = {
      ts: new Date().toISOString(),
      task_id: input.task_id || input.id || taskInput.task_id || null,
      status: input.status || null,
      title,
      subject:
        sanitizeText(input.subject) ||
        sanitizeText(taskInput.description) ||
        title,
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
