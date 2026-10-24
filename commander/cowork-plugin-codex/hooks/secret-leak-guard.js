#!/usr/bin/env node
/**
 * secret-leak-guard.js
 * Hook: PreToolUse
 * Scans tool inputs for common secret patterns before the tool executes.
 * Blocks the tool call and emits a warning if secrets are detected.
 * Patterns loaded from commander/core/secret-patterns.json.
 * Never crashes the session — fail open on any error.
 */
import { track } from '../lib/telemetry.mjs';
import { emitDeny } from './lib/emit.mjs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATTERNS_FILE_NEW = join(__dirname, '..', 'lib', 'secret-patterns.json');
const PATTERNS_FILE_LEGACY = join(__dirname, '..', '..', 'core', 'secret-patterns.json');
const PATTERNS_FILE = existsSync(PATTERNS_FILE_NEW) ? PATTERNS_FILE_NEW : PATTERNS_FILE_LEGACY;

// Tools whose inputs are worth scanning
const SCANNED_TOOLS = new Set([
  'Write', 'Edit', 'MultiEdit', 'Bash', 'PowerShell', 'WebSearch',
  'mcp__', // prefix match handled below
]);

function toolShouldBeScanned(toolName) {
  if (SCANNED_TOOLS.has(toolName)) return true;
  if (toolName.startsWith('mcp__')) return true;
  return false;
}

function extractTextFromInput(toolInput) {
  if (typeof toolInput === 'string') return toolInput;
  if (typeof toolInput !== 'object' || toolInput === null) return '';
  // Flatten all string values from the input object
  return Object.values(toolInput)
    .map(v => (typeof v === 'string' ? v : JSON.stringify(v)))
    .join('\n');
}

// allowlist: placeholder/test-key terms. Only the token containing the term is blanked out, so one
// placeholder (e.g. REPLACE_ME) elsewhere in a file or command cannot exempt a real key next to it.
function stripAllowlistedTerms(text, allowlist) {
  let out = text;
  for (const term of allowlist || []) {
    if (typeof term !== 'string' || !term) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`[A-Za-z0-9_\\-]*${escaped}[A-Za-z0-9_\\-]*`, 'g'), ' ');
  }
  return out;
}

// allowlistRegex: case-sensitive token patterns (full git SHAs, sha256 digests) blanked out before scanning.
// The scan below is case-insensitive, so a lowercase 40-hex commit SHA containing "ac" + 32 hex matched the
// Twilio SID pattern and stalled lanes on every git command. Only the matched token is removed.
function stripAllowlistedTokens(text, allowlistRegex) {
  let out = text;
  for (const source of allowlistRegex || []) {
    try {
      out = out.replace(new RegExp(source, 'g'), ' ');
    } catch {
      // Invalid regex in config — skip it
    }
  }
  return out;
}

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PreToolUse', handler: 'secret-leak-guard' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  const toolName = input.tool_name || input.toolName || '';

  // Skip non-scanned tools immediately
  if (!toolShouldBeScanned(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    // Load patterns
    let patternsConfig = { patterns: [], allowlist: [] };
    try {
      patternsConfig = JSON.parse(await readFile(PATTERNS_FILE, 'utf8'));
    } catch {
      // Patterns file missing — fail open
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const toolInput = input.tool_input || input.input || {};
    const textToScan = stripAllowlistedTerms(
      stripAllowlistedTokens(extractTextFromInput(toolInput), patternsConfig.allowlistRegex),
      patternsConfig.allowlist
    );

    if (!textToScan.trim()) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Scan for secret patterns
    const detected = [];
    for (const pattern of patternsConfig.patterns || []) {
      try {
        const re = new RegExp(pattern.regex, 'i');
        if (re.test(textToScan)) {
          detected.push({ id: pattern.id, label: pattern.label, severity: pattern.severity });
        }
      } catch {
        // Invalid regex in config — skip this pattern
      }
    }

    if (detected.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const labels = detected.map(d => `${d.label} [${d.severity}]`).join(', ');
    const stopReason = `CCC SECRET GUARD: Possible secret detected in ${toolName} input — ${labels}. ` +
      `Use env vars or 1Password. False positive? Add to allowlist in secret-patterns.json.`;

    process.stdout.write(JSON.stringify(emitDeny(stopReason)) + '\n');
  } catch {
    // Fail open — never block session on error
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
