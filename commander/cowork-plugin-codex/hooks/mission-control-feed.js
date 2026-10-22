#!/usr/bin/env node
/**
 * mission-control-feed.js
 * Hooks: PostToolUse (matcher *), PermissionRequest
 *
 * Captures delegation + data-flow events for Commander Mission Control.
 * Only five tools matter (Agent, SendMessage, Workflow, TaskCreate,
 * TaskUpdate); every other tool call takes the zero-I/O fast path —
 * stdin read, one stdout line, exit 0. No fs touches on skip.
 *
 * Event shape appended to ~/.claude/commander/mission-control/events.jsonl:
 *   { ts, session_id, source_app, type, tool, actor, subject, detail, status }
 *
 * Privacy constraint: detail is truncated to ≤200 chars — full prompts
 * never land on disk. Rotation: at 10MB the file renames to
 * events.YYYY-MM-DD.jsonl (same pattern as agent-run-logger.js).
 *
 * Never blocks — always exits 0 with {continue:true,suppressOutput:true}.
 * Core free forever — no license check, no tier gating.
 */
import fs from 'node:fs';
import path from 'node:path';

const OK = JSON.stringify({ continue: true, suppressOutput: true }) + '\n';

const TOOL_TYPES = {
  Agent: 'delegation',
  SendMessage: 'message',
  Workflow: 'workflow',
  TaskCreate: 'task',
  TaskUpdate: 'task',
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const STDIN_MAX_BYTES = 256 * 1024;
const SUBJECT_MAX = 120;
const DETAIL_MAX = 200;

// This file is copied verbatim into the Codex plugin by scripts/build-codex.js, so the
// producing app is detected at runtime. CODEX_PLUGIN_ROOT is NOT a real Codex variable
// (verified 2026-07-22 against learn.chatgpt.com/docs/hooks -- Codex exports its native
// PLUGIN_ROOT/PLUGIN_DATA plus CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA compatibility
// aliases, never CODEX_PLUGIN_ROOT), so it can never actually fire in production. The
// primary, deterministic signal is this file's own resolved path: the mirror lives under
// cowork-plugin-codex/ (or a Codex install's ~/.codex/ tree). CODEX_PLUGIN_ROOT is kept
// as a harmless fallback only for back-compat with existing tests and in case a future
// Codex build introduces it. CCC_SOURCE_APP is an explicit override for callers that want
// to force the label. LIMITATION: none of these signals are Codex-confirmed at runtime --
// a symlinked or renamed plugin install directory would misclassify via the path check.
function detectSourceApp() {
  if (process.env.CCC_SOURCE_APP === 'codex' || process.env.CCC_SOURCE_APP === 'claude-code') {
    return process.env.CCC_SOURCE_APP;
  }
  if (/cowork-plugin-codex|\/\.codex\//.test(import.meta.url)) return 'codex';
  if (process.env.CODEX_PLUGIN_ROOT) return 'codex';
  return 'claude-code';
}

const SOURCE_APP = detectSourceApp();

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

function truncate(value, max) {
  const redacted = redact(value);
  if (redacted === null) return null;
  const trimmed = redacted.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function firstString(obj, keys) {
  for (const key of keys) {
    if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key];
  }
  return null;
}

function rotateLog(dir, file) {
  try {
    const info = fs.statSync(file);
    if (info.size >= MAX_BYTES) {
      const now = new Date();
      const datestamp =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0');
      const timestamp =
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
      let archive = path.join(dir, `events.${datestamp}-${timestamp}.jsonl`);
      let counter = 1;
      while (fs.existsSync(archive)) {
        archive = path.join(
          dir,
          `events.${datestamp}-${timestamp}-${counter}.jsonl`
        );
        counter += 1;
      }
      fs.renameSync(file, archive);
    }
  } catch {
    // File doesn't exist yet or stat failed — that's fine
  }
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
        process.stdout.write(OK);
        return;
      }
      chunks.push(buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    process.stdout.write(OK);
    return;
  }

  const toolName =
    input && typeof input.tool_name === 'string' ? input.tool_name : null;
  const type = toolName ? TOOL_TYPES[toolName] : undefined;
  const hasHookEventName =
    input &&
    typeof input === 'object' &&
    Object.prototype.hasOwnProperty.call(input, 'hook_event_name');
  const isPermissionRequest =
    input &&
    typeof input === 'object' &&
    (hasHookEventName
      ? input.hook_event_name === 'PermissionRequest'
      : !Object.prototype.hasOwnProperty.call(input, 'tool_response') &&
        (Object.prototype.hasOwnProperty.call(input, 'permission_request') ||
          (Object.prototype.hasOwnProperty.call(input, 'tool_use_id') &&
            typeof input.message === 'string' &&
            input.message.trim())));
  if (!isPermissionRequest && !type) {
    // Fast path — fires on EVERY tool call, so: zero I/O beyond stdin.
    process.stdout.write(OK);
    return;
  }

  try {
    const ti =
      input.tool_input &&
      typeof input.tool_input === 'object' &&
      !Array.isArray(input.tool_input)
        ? input.tool_input
        : {};
    const permissionRequest =
      input.permission_request &&
      typeof input.permission_request === 'object' &&
      !Array.isArray(input.permission_request)
        ? input.permission_request
        : {};
    const sessionId =
      (typeof input.session_id === 'string' && input.session_id) ||
      process.env.CLAUDE_SESSION_ID ||
      null;
    const permissionTool =
      firstString(input, ['tool_name', 'tool', 'requested_tool']) ||
      firstString(permissionRequest, [
        'tool_name',
        'tool',
        'requested_tool',
        'name',
      ]);

    const entry = isPermissionRequest
      ? {
          ts: new Date().toISOString(),
          session_id: sessionId,
          source_app: SOURCE_APP,
          type: 'permission',
          tool: redact(permissionTool),
          actor: null,
          subject: truncate(
            (typeof input.permission_request === 'string' &&
              input.permission_request) ||
              firstString(input, ['message']) ||
              firstString(permissionRequest, [
                'request',
                'message',
                'description',
              ]) ||
              firstString(input, ['tool_description', 'description']) ||
              firstString(ti, ['description', 'prompt', 'command']),
            SUBJECT_MAX
          ),
          status: 'awaiting',
        }
      : {
          ts: new Date().toISOString(),
          session_id: sessionId,
          source_app: SOURCE_APP,
          type,
          tool: redact(toolName),
          actor: firstString(ti, [
            'subagent_type',
            'agent_name',
            'agent',
            'teammate',
            'recipient',
            'name',
            'to',
          ]),
          subject: truncate(
            firstString(ti, ['description', 'subject', 'label', 'prompt']),
            SUBJECT_MAX
          ),
          detail: truncate(
            firstString(ti, ['prompt', 'message', 'content', 'task']),
            DETAIL_MAX
          ),
          status:
            toolName === 'TaskUpdate' && typeof ti.status === 'string'
              ? ti.status
              : null,
        };

    const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const dir = path.join(HOME, '.claude', 'commander', 'mission-control');
    const file = path.join(dir, 'events.jsonl');
    fs.mkdirSync(dir, { recursive: true });
    rotateLog(dir, file);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort logging — never block the tool call
  }

  process.stdout.write(OK);
}

main().catch(() => {
  process.stdout.write(OK);
});
