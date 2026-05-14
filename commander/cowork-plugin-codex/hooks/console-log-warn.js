#!/usr/bin/env node
/**
 * console-log-warn.js
 * Hook: PostToolUse (Edit/Write/MultiEdit)
 * Warns about console.log statements after JS/TS file edits with line
 * numbers. Non-blocking — pure stderr warning. Skips test/config/scripts
 * directories where console.log is intentional.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Never crashes the session — fail open on any error.
 */
import { track } from '../lib/telemetry.mjs';
import { readFileSync, existsSync } from 'node:fs';

const EXCLUDED_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.config\.[jt]s$/,
  /(^|\/)scripts\//,
  /(^|\/)__tests__\//,
  /(^|\/)__mocks__\//,
];

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PostToolUse', handler: 'console-log-warn' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const toolName = input.tool_name || input.toolName || '';
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const filePath = input.tool_input?.file_path || '';
    if (!filePath || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }
    if (EXCLUDED_PATTERNS.some(p => p.test(filePath))) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }
    if (!existsSync(filePath)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    lines.forEach((line, idx) => {
      if (/console\.log/.test(line)) {
        matches.push(`${idx + 1}: ${line.trim()}`);
      }
    });

    if (matches.length > 0) {
      console.error(`[CCC] WARNING: console.log found in ${filePath}`);
      matches.slice(0, 5).forEach(m => console.error(`  ${m}`));
      if (matches.length > 5) console.error(`  ... +${matches.length - 5} more`);
      console.error('[CCC] Remove console.log before committing');
    }
  } catch {
    // fail open
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
