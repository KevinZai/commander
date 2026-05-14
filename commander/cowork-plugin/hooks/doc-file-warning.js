#!/usr/bin/env node
/**
 * doc-file-warning.js
 * Hook: PreToolUse (Write)
 * Warns when agents try to write ad-hoc scratch markdown (NOTES.md,
 * TODO.md, SCRATCH.md, etc.) outside structured directories. Encourages
 * placing docs under docs/, .claude/, .github/, skills/, or tasks/.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Non-blocking — warns only via stderr.
 * Never crashes the session — fail open on any error.
 */
import { track } from '../lib/telemetry.mjs';
import path from 'node:path';

const ADHOC_FILENAMES = /^(NOTES|TODO|SCRATCH|TEMP|DRAFT|BRAINSTORM|SPIKE|DEBUG|WIP)\.(md|txt)$/;
const STRUCTURED_DIRS = /(^|\/)(docs|\.claude|\.github|commands|skills|benchmarks|templates|\.history|memory|tasks)\//;

function isSuspiciousDocPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);
  if (!/\.(md|txt)$/.test(basename)) return false;
  if (!ADHOC_FILENAMES.test(basename)) return false;
  if (STRUCTURED_DIRS.test(normalized)) return false;
  return true;
}

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PreToolUse', handler: 'doc-file-warning' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const toolName = input.tool_name || input.toolName || '';
    if (toolName !== 'Write') {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const filePath = String(input.tool_input?.file_path || '');
    if (filePath && isSuspiciousDocPath(filePath)) {
      console.error('[CCC] WARNING: Ad-hoc documentation filename detected');
      console.error(`[CCC] File: ${filePath}`);
      console.error('[CCC] Consider placing under: docs/, .claude/, skills/, tasks/, or .github/');
    }
  } catch {
    // fail open
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
