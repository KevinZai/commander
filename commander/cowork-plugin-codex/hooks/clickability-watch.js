#!/usr/bin/env node
/**
 * clickability-watch.js
 * Hook: Stop
 *
 * Observes the last assistant message for "Reply A/B/C" / "Type 1/2/3" patterns
 * that should have used AskUserQuestion instead. Logs violations to JSONL —
 * DOES NOT block the user.
 *
 * Input: CLAUDE_LAST_ASSISTANT_MESSAGE env var (if set)
 *   OR   reads last entry from ~/.claude/projects/<id>/<session>.jsonl
 *
 * Output: appends to ~/.claude/commander/clickability-violations.jsonl
 *
 * Toggle: CCC_CLICKABILITY_WATCH_DISABLE=1 → silent, no-op
 * Hard timeout: 1500ms
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const CCC_DIR = path.join(HOME, '.claude', 'commander');
const VIOLATIONS_FILE = path.join(CCC_DIR, 'clickability-violations.jsonl');

// Hard timeout — never hang the hook chain
const timeout = setTimeout(() => {
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
 * Read the last assistant message from the session JSONL.
 * Looks for CLAUDE_SESSION_ID + CLAUDE_PROJECT_DIR env vars, then scans
 * ~/.claude/projects/ for the most recently modified .jsonl file as fallback.
 */
function readLastAssistantMessageFromJsonl() {
  try {
    // Prefer explicit session file
    const projectDir = process.env.CLAUDE_PROJECT_DIR;
    const sessionId = process.env.CLAUDE_SESSION_ID;

    let jsonlPath = null;

    if (projectDir && sessionId) {
      const candidate = path.join(projectDir, `${sessionId}.jsonl`);
      if (fs.existsSync(candidate)) jsonlPath = candidate;
    }

    // Fallback: find most recently modified .jsonl in ~/.claude/projects/
    if (!jsonlPath) {
      const projectsRoot = path.join(HOME, '.claude', 'projects');
      if (!fs.existsSync(projectsRoot)) return null;

      let newest = null;
      let newestMtime = 0;

      const subdirs = fs.readdirSync(projectsRoot, { withFileTypes: true });
      for (const sub of subdirs) {
        if (!sub.isDirectory()) continue;
        const subDir = path.join(projectsRoot, sub.name);
        let files;
        try { files = fs.readdirSync(subDir); } catch { continue; }
        for (const f of files) {
          if (!f.endsWith('.jsonl')) continue;
          const fp = path.join(subDir, f);
          try {
            const mtime = fs.statSync(fp).mtimeMs;
            if (mtime > newestMtime) { newestMtime = mtime; newest = fp; }
          } catch { /* skip */ }
        }
      }

      if (!newest) return null;
      jsonlPath = newest;
    }

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

function main() {
  // Disable check
  if (process.env.CCC_CLICKABILITY_WATCH_DISABLE === '1') {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Get last assistant message — prefer env var, fall back to JSONL scan
  const content = process.env.CLAUDE_LAST_ASSISTANT_MESSAGE
    || readLastAssistantMessageFromJsonl();

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

  const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
  const ts = new Date().toISOString();

  for (const v of violations) {
    appendViolation({
      ts,
      session: sessionId,
      pattern: v.pattern,
      snippet: v.snippet,
    });
  }

  // Always continue — observation only, never block
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
}

main();
