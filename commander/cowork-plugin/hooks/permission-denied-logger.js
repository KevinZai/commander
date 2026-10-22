#!/usr/bin/env node
/**
 * permission-denied-logger.js
 * Hook: PermissionDenied (auto mode denied a tool call)
 *
 * Appends one row to ~/.claude/commander/analytics/permission-gate.jsonl in the
 * same shape permission-gate.js writes ({ timestamp, sessionId, decision,
 * toolName, ... }) so lib/safety-snapshot.js and /ccc-safety count auto-mode
 * denials as "blocked" (classifyDecision matches /denied/).
 *
 * Never asks for a retry (no hookSpecificOutput.retry): the denial stands.
 * Fail-open: always exits 0, prints a silent pass-through, writes only under
 * ~/.claude/commander/.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { emitSilent } from './lib/emit.mjs';

const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);

// Auto mode tends to deny exactly the commands that carry credentials, so the
// snippet and the classifier reason are redacted with the same pattern set
// lib/safety-snapshot.js applies before anything reaches disk.
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{8,}/g,
  /Bearer\s+[A-Za-z0-9._~+\/=-]{8,}/gi,
  /\b(basic)\s+[A-Za-z0-9+\/]{4,}={0,2}/gi,
  /\b(gh[pousr]|github_pat)_[A-Za-z0-9_]{8,}/g,
  /\b(xox[abp]|lin_api|AKIA)[A-Za-z0-9_-]{8,}/g,
  /(?:api[_-]?key|token|secret|password|passwd|authorization)(\s*[:=]\s*|\s+)[\x27"]?[A-Za-z0-9._~+\/=-]{6,}/gi,
];
const redact = (v, n) => SECRET_PATTERNS.reduce((s, re) => s.replace(re, '[redacted]'), clip(v, n));

async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildRow(input, now = new Date()) {
  const toolName = clip(input.tool_name || 'unknown', 64);
  const row = {
    timestamp: now.toISOString(),
    sessionId: clip(input.session_id || process.env.CLAUDE_SESSION_ID || 'unknown', 64),
    decision: 'denied-auto-mode',
    toolName,
    source: 'PermissionDenied',
  };
  if (input.reason) row.reason = redact(input.reason, 160);
  if (input.mcp_server) row.mcpServer = clip(input.mcp_server, 64);
  const cmd = input.tool_input?.command;
  if (toolName === 'Bash' && typeof cmd === 'string') row.commandSnippet = redact(cmd, 120);
  return row;
}

async function main() {
  const input = await readInput();
  if (input.hook_event_name === 'PermissionDenied' || input.tool_name) {
    try {
      const dir = join(process.env.HOME || homedir(), '.claude', 'commander', 'analytics');
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, 'permission-gate.jsonl'), JSON.stringify(buildRow(input)) + '\n');
    } catch {
      // Logging failure must never affect the session.
    }
  }
  process.stdout.write(JSON.stringify(emitSilent()) + '\n');
}

setTimeout(() => process.exit(0), 5000).unref();
main().catch(() => {
  process.stdout.write(JSON.stringify(emitSilent()) + '\n');
});
