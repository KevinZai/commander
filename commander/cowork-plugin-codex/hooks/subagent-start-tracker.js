#!/usr/bin/env node
/**
 * subagent-start-tracker.js
 * Hook: SubagentStart
 * Logs sub-agent dispatch info (name, prompt, model, session) for observability.
 * Stdin JSON is the PRIMARY source — common top-level and nested
 * (subagent/tool_input) field paths are probed defensively, since the
 * exact SubagentStart payload shape varies by caller — env vars are a
 * fallback. Never blocks. The prompt is redacted + capped at 500 chars —
 * full prompts never land on disk (mirrors mission-control-feed.js's
 * redact() + STDIN_MAX pattern).
 */
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const LOG_DIR = path.join(HOME, '.claude', 'commander');
const LOG_FILE = path.join(LOG_DIR, 'subagent-runs.jsonl');
const STDIN_MAX_BYTES = 256 * 1024;
const PROMPT_MAX = 500;

function redact(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/(authorization\s*[=:]\s*)(?:bearer|basic|digest|negotiate|token)\s+[^\s"']+/gi, '$1[redacted]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[redacted]')
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, '[redacted]')
    .replace(/hf_[A-Za-z0-9]{16,}/g, '[redacted]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(
      /((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[=:]\s*)\S+/gi,
      '$1[redacted]'
    );
}

function truncate(value, max) {
  const redacted = redact(value);
  if (redacted === null) return null;
  const trimmed = redacted.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function firstString(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
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
    const ti =
      input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
    const sub =
      input.subagent && typeof input.subagent === 'object' ? input.subagent : {};

    const entry = {
      ts: new Date().toISOString(),
      agent_name:
        firstString(
          input.agent_name,
          input.subagent_type,
          input.agent_type,
          sub.name,
          sub.agent_name,
          sub.type,
          ti.subagent_type,
          ti.agent_name
        ) ||
        process.env.CLAUDE_AGENT_NAME ||
        null,
      prompt: truncate(
        firstString(input.prompt, input.task, sub.prompt, ti.prompt, ti.task) ||
          process.env.CLAUDE_AGENT_PROMPT,
        PROMPT_MAX
      ),
      model:
        firstString(input.model, sub.model, ti.model) ||
        process.env.CLAUDE_MODEL ||
        null,
      session_id:
        firstString(input.session_id, input.sessionId, sub.session_id) ||
        process.env.CLAUDE_SESSION_ID ||
        null,
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
