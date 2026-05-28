#!/usr/bin/env node
/**
 * stale-claude-md-nudge.js
 * Hook: InstructionsLoaded
 * Checks CLAUDE.md mtime in cwd. If >30 days old, emits a nudge status.
 * Respects CC_NUDGE_DISABLE=1. Always exits 0.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) JSON.parse(raw); // validate but discard
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  // Respect disable flag — emit nothing when set
  if (process.env.CC_NUDGE_DISABLE === '1') {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    let stat;
    try {
      stat = fs.statSync(claudeMdPath);
    } catch {
      // No CLAUDE.md in cwd — nothing to nudge
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < STALE_MS) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const status = `CLAUDE.md is stale (last updated ${ageDays} days ago). Run /ccc-refresh to update it with the latest CCC best practices.`;

    process.stdout.write(JSON.stringify({ continue: true, status }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
