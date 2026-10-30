#!/usr/bin/env node
/**
 * clickability-watch.js
 * Hook: Stop
 *
 * Observes the last assistant message for "Reply A/B/C" / "Type 1/2/3" patterns
 * that should have used AskUserQuestion instead. Logs violations to JSONL —
 * DOES NOT block the user.
 *
 * Input: the Stop payload on stdin: last_assistant_message, else the last
 *        assistant entry of transcript_path (this session's own transcript).
 *        CLAUDE_LAST_ASSISTANT_MESSAGE / CLAUDE_PROJECT_DIR+CLAUDE_SESSION_ID
 *        env vars remain as fallbacks. No transcript is guessed: reading the
 *        newest .jsonl under ~/.claude/projects/ picked up another parallel
 *        session's reply (CC-1360 F22).
 *
 * Output: appends to ~/.claude/commander/clickability-violations.jsonl
 *
 * Toggle: CCC_CLICKABILITY_WATCH_DISABLE=1 → silent, no-op
 * Hard timeout: 1500ms
 */

import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const CCC_DIR = stateDir();
const VIOLATIONS_FILE = path.join(CCC_DIR, 'clickability-violations.jsonl');

// Hard timeout — never hang the hook chain
const timeout = setTimeout(() => {
    track('hook_fired', { hook: 'Stop', handler: 'clickability-watch' });

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  process.exit(0);
}, 1500);
timeout.unref();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure ~/.claude/commander/ exists */
function ensureCccDir() {
  try {
    fs.mkdirSync(CCC_DIR, { recursive: true });
  } catch {
    // non-fatal
  }
}

/** Append a JSONL line to the violations file */
function appendViolation(entry) {
  try {
    ensureCccDir();
    fs.appendFileSync(VIOLATIONS_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // non-fatal
  }
}

/**
 * Read the last assistant message from this session's transcript JSONL:
 * the payload's transcript_path, else CLAUDE_PROJECT_DIR/CLAUDE_SESSION_ID.
 * Returns null when neither names an existing file.
 */
function readLastAssistantMessageFromJsonl(input = {}) {
  try {
    let jsonlPath = null;
    if (typeof input.transcript_path === 'string' && input.transcript_path
        && fs.existsSync(input.transcript_path)) {
      jsonlPath = input.transcript_path;
    }

    const projectDir = process.env.CLAUDE_PROJECT_DIR;
    const sessionId = process.env.CLAUDE_SESSION_ID;
    if (!jsonlPath && projectDir && sessionId) {
      const candidate = path.join(projectDir, `${sessionId}.jsonl`);
      if (fs.existsSync(candidate)) jsonlPath = candidate;
    }

    if (!jsonlPath) return null;

    // Read the file and find last assistant message
    const raw = fs.readFileSync(jsonlPath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);

    // Walk from the end to find last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        // Handle various JSONL formats
        if (entry.role === 'assistant' && typeof entry.content === 'string') {
          return entry.content;
        }
        if (entry.type === 'assistant' && entry.message?.content) {
          const c = entry.message.content;
          if (typeof c === 'string') return c;
          if (Array.isArray(c)) {
            return c.filter(b => b.type === 'text').map(b => b.text).join('\n');
          }
        }
        if (entry.message?.role === 'assistant') {
          const c = entry.message.content;
          if (typeof c === 'string') return c;
          if (Array.isArray(c)) {
            return c.filter(b => b.type === 'text').map(b => b.text).join('\n');
          }
        }
      } catch { /* skip malformed lines */ }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/** Red-flag regex patterns for text-based choice prompts */
const RED_FLAG_PATTERNS = [
  { re: /\breply\s+[a-d]\b/i,        label: 'Reply A/B/C' },
  { re: /\btype\s+[1-9]\b/i,         label: 'Type 1/2/3' },
  { re: /\bpick\s+[a-d]\b/i,         label: 'Pick a/b/c' },
  { re: /^\s*[A-D]\)\s+\S/m,         label: 'A) option list' },
];

/** Check if AskUserQuestion was used in the same content */
function hasAskUserQuestion(content) {
  return /AskUserQuestion/i.test(content);
}

/**
 * Scan content for violations.
 * Returns array of { pattern, snippet } or empty array.
 */
function detectViolations(content) {
  if (!content) return [];
  if (hasAskUserQuestion(content)) return []; // correct usage — not a violation

  const found = [];
  for (const { re, label } of RED_FLAG_PATTERNS) {
    const match = content.match(re);
    if (match) {
      const idx = content.indexOf(match[0]);
      const snippet = content.slice(Math.max(0, idx - 10), idx + 50).replace(/\n/g, ' ');
      found.push({ pattern: label, snippet: snippet.slice(0, 60) });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Disable check
  if (process.env.CCC_CLICKABILITY_WATCH_DISABLE === '1') {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  const input = await readStdinJson();
  const content = (typeof input.last_assistant_message === 'string' && input.last_assistant_message)
    || process.env.CLAUDE_LAST_ASSISTANT_MESSAGE
    || readLastAssistantMessageFromJsonl(input);

  if (!content) {
    // Graceful no-op — no message available
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  const violations = detectViolations(content);

  if (violations.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';
  const ts = new Date().toISOString();

  for (const v of violations) {
    appendViolation({
      ts,
      session: sessionId,
      pattern: v.pattern,
      snippet: v.snippet,
    });
  }

  // Close the loop: tell the user/model immediately — but never block.
  // suggest-ticker.js also tail-reads the violations JSONL and injects a
  // one-turn reminder on the next prompt.
  process.stdout.write(JSON.stringify(
    emitUser('⚠️ last reply offered choices as text — use AskUserQuestion chips')
  ) + '\n');
}

main();
