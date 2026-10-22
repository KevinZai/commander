#!/usr/bin/env node
/**
 * skill-runs-logger.js
 * Hook: UserPromptSubmit
 *
 * Records slash-command skill launches in
 * ~/.claude/commander/skill-runs.jsonl without retaining prompt content.
 *
 * Record shape: { ts, skill, session_id }
 * Never blocks — always exits 0 with {continue:true,suppressOutput:true}.
 */
import fs from 'node:fs';
import path from 'node:path';

const OK = JSON.stringify({ continue: true, suppressOutput: true }) + '\n';
const MAX_BYTES = 10 * 1024 * 1024;
const STDIN_MAX_BYTES = 256 * 1024;
// Leading `/` is the Claude Code invocation form; leading `$` is Codex's
// (`$ccc-review`) — this hook is mirrored verbatim into the Codex plugin, so
// both must log or Codex top-skill analytics stay permanently empty.
const SKILL_PATTERN = /^[/$]([a-z][a-z0-9:_-]{1,60})/i;
// Built-in CLI slash commands are not skills — without this, /model and /clear top the "most-used skill" analytics.
const BUILTIN_COMMANDS = new Set([
  'model', 'clear', 'compact', 'plan', 'config', 'help', 'resume', 'exit',
  'login', 'logout', 'status', 'init', 'permissions', 'agents', 'doctor',
  'hooks', 'mcp', 'fast', 'workflows',
]);
// build:codex mirrors this hook verbatim into the Codex plugin; runs must stay
// separable per runtime or Claude-vs-Codex analytics can never be backfilled.
// Same detection as mission-control-feed.js: CODEX_PLUGIN_ROOT is NOT a real
// Codex variable (verified 2026-07-22 against learn.chatgpt.com/docs/hooks),
// so the deterministic mirror-path check is primary; CODEX_PLUGIN_ROOT is
// kept only as a back-compat fallback, and CCC_SOURCE_APP is an explicit
// override. See mission-control-feed.js for the full rationale + limitation.
function detectSourceApp() {
  if (process.env.CCC_SOURCE_APP === 'codex' || process.env.CCC_SOURCE_APP === 'claude-code') {
    return process.env.CCC_SOURCE_APP;
  }
  if (/cowork-plugin-codex|\/\.codex\//.test(import.meta.url)) return 'codex';
  if (process.env.CODEX_PLUGIN_ROOT) return 'codex';
  return 'claude-code';
}

const SOURCE_APP = detectSourceApp();

function rotateLog(dir, file) {
  try {
    const info = fs.statSync(file);
    if (info.size < MAX_BYTES) return;

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
    let archive = path.join(
      dir,
      `skill-runs.${datestamp}-${timestamp}.jsonl`
    );
    let counter = 1;
    while (fs.existsSync(archive)) {
      archive = path.join(
        dir,
        `skill-runs.${datestamp}-${timestamp}-${counter}.jsonl`
      );
      counter += 1;
    }
    fs.renameSync(file, archive);
  } catch {
    // File does not exist yet or rotation failed — logging remains best-effort.
  }
}

async function readInput() {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > STDIN_MAX_BYTES) return null;
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : {};
}

async function main() {
  try {
    const input = await readInput();
    if (!input) return;

    const prompt =
      (typeof input.prompt === 'string' && input.prompt) ||
      (typeof input.user_prompt === 'string' && input.user_prompt) ||
      '';
    const match = prompt.match(SKILL_PATTERN);
    if (!match) return;
    if (BUILTIN_COMMANDS.has(match[1].toLowerCase())) return;

    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const dir = path.join(home, '.claude', 'commander');
    const file = path.join(dir, 'skill-runs.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      skill: match[1].toLowerCase(),
      source_app: SOURCE_APP,
      session_id:
        (typeof input.session_id === 'string' && input.session_id) ||
        process.env.CLAUDE_SESSION_ID ||
        null,
    };

    fs.mkdirSync(dir, { recursive: true });
    rotateLog(dir, file);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    // Malformed input and filesystem failures must never block submission.
  } finally {
    process.stdout.write(OK);
  }
}

main().catch(() => {
  process.stdout.write(OK);
});
