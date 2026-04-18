#!/usr/bin/env node
/**
 * secret-leak-guard.js
 * Hook: PreToolUse
 * Scans tool inputs for common secret patterns before the tool executes.
 * Blocks the tool call and emits a warning if secrets are detected.
 * Patterns loaded from commander/core/secret-patterns.json.
 * Never crashes the session — fail open on any error.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATTERNS_FILE = join(__dirname, '..', '..', 'core', 'secret-patterns.json');

// Tools whose inputs are worth scanning
const SCANNED_TOOLS = new Set([
  'Write', 'Edit', 'MultiEdit', 'Bash', 'WebSearch',
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

function isAllowlisted(text, allowlist) {
  return allowlist.some(term => text.includes(term));
}

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
    const textToScan = extractTextFromInput(toolInput);

    if (!textToScan) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Check allowlist first
    if (isAllowlisted(textToScan, patternsConfig.allowlist || [])) {
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
      `Review the input before proceeding. Use environment variables or 1Password instead of inline secrets. ` +
      `If this is a false positive, add the pattern to the allowlist in commander/core/secret-patterns.json.`;

    process.stdout.write(JSON.stringify({
      continue: false,
      stopReason,
    }) + '\n');
  } catch {
    // Fail open — never block session on error
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
