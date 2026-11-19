#!/usr/bin/env node
/**
 * secret-leak-guard.js
 * Hook: PreToolUse
 * Scans tool inputs for common secret patterns before the tool executes.
 * Blocks the tool call and emits a warning if secrets are detected.
 * Patterns loaded from commander/core/secret-patterns.json.
 * Fails closed: a scanned call that cannot be scanned (unreadable patterns,
 * an error mid-scan) is denied with the reason, since passing it unscanned
 * would let a secret through. Calls to tools it does not scan always pass.
 */
import { track } from '../lib/telemetry.mjs';
import { emitDeny } from './lib/emit.mjs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from './lib/code-mode.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import { CODEX_PATCH_TOOL, editTargets } from './lib/edit-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATTERNS_FILE_NEW = join(__dirname, '..', 'lib', 'secret-patterns.json');
const PATTERNS_FILE_LEGACY = join(__dirname, '..', '..', 'core', 'secret-patterns.json');
const PATTERNS_FILE = existsSync(PATTERNS_FILE_NEW) ? PATTERNS_FILE_NEW : PATTERNS_FILE_LEGACY;

// Tools whose inputs are worth scanning
const SCANNED_TOOLS = new Set([
  'Write', 'Edit', 'MultiEdit', 'Bash', 'PowerShell', 'WebSearch',
  CODEX_PATCH_TOOL, // Codex file edits: the patch text is parsed so only written paths and added lines are scanned
  'REPL', // Code Mode: the whole JavaScript program is in tool_input.code, so a key literal in it is caught before it runs
  'mcp__', // prefix match handled below
]);

export function toolShouldBeScanned(toolName) {
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

// Codex apply_patch: scan the paths and the lines the patch adds. Removed lines are left out so a
// patch that deletes a leaked key is not itself blocked. A patch that cannot be parsed is scanned whole.
function textForScan(toolName, input, toolInput) {
  if (toolName === CODEX_PATCH_TOOL) {
    const targets = editTargets(input);
    if (targets.length) return targets.map((t) => `${t.path}\n${t.content}`).join('\n');
  }
  return extractTextFromInput(toolInput);
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

/** Deny a scanned call that could not be scanned (fail closed). */
export function scanFailed(toolName, why) {
  return emitDeny(`CCC SECRET GUARD: could not scan this ${toolName || 'tool'} call for secrets (${why}), so it is blocked. ` +
    'Reinstall or update the Commander plugin to restore secret-patterns.json.');
}

export async function run(input = {}) {
  track('hook_fired', { hook: 'PreToolUse', handler: 'secret-leak-guard' });

  const toolName = input.tool_name || input.toolName || '';

  // Skip non-scanned tools immediately
  if (!toolShouldBeScanned(toolName)) {
    return { continue: true };
  }

  try {
    // Load patterns
    let patternsConfig = { patterns: [], allowlist: [] };
    try {
      patternsConfig = JSON.parse(await readFile(PATTERNS_FILE, 'utf8'));
    } catch (err) {
      return scanFailed(toolName, `cannot read ${PATTERNS_FILE} (${err?.code || 'invalid JSON'})`);
    }
    if (!patternsConfig || !Array.isArray(patternsConfig.patterns)) {
      return scanFailed(toolName, 'secret-patterns.json has no patterns list');
    }

    const toolInput = input.tool_input || input.input || {};
    const textToScan = stripAllowlistedTerms(
      stripAllowlistedTokens(textForScan(toolName, input, toolInput), patternsConfig.allowlistRegex),
      patternsConfig.allowlist
    );

    if (!textToScan.trim()) {
      return { continue: true };
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
      return { continue: true };
    }

    const labels = detected.map(d => `${d.label} [${d.severity}]`).join(', ');
    const stopReason = `CCC SECRET GUARD: Possible secret detected in ${toolName} input — ${labels}. ` +
      `Use env vars or 1Password. False positive? Add to allowlist in secret-patterns.json.`;

    return emitDeny(stopReason);
  } catch (err) {
    return scanFailed(toolName, err?.message || 'scan error');
  }
}

// Standalone entry (hooks.json may still call this file directly); the PreToolUse dispatcher imports run() instead.
if (isMainModule(import.meta.url)) {
  readStdinJson().then(run).catch((err) => scanFailed('', err?.message || 'hook error')).then((out) => {
    process.stdout.write(JSON.stringify(out) + '\n');
  });
}
