#!/usr/bin/env node
/**
 * post-compact-recovery.js
 * Hook: PostCompact
 * Reads active-session.json and emits an orientation status message so the
 * model knows it just returned from context compaction. Always exits 0.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function main() {
  // Parse stdin defensively
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) JSON.parse(raw); // validate but discard — we don't need it
  } catch {
    // Malformed or empty stdin — still continue
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const sessionFile = path.join(HOME, '.claude', 'commander', 'sessions', 'active-session.json');

    let session = null;
    try {
      const raw = fs.readFileSync(sessionFile, 'utf8');
      session = JSON.parse(raw);
    } catch {
      // No session file — still fine, just no orientation message
    }

    if (!session) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const cost = typeof session.estimatedCost === 'number'
      ? ` ($${session.estimatedCost.toFixed(2)} so far)`
      : '';
    const mode = session.activeMode ? ` · mode: ${session.activeMode}` : '';
    const status = `CCC context compact complete${cost}${mode}. CCC session state restored — ready to continue.`;

    process.stdout.write(JSON.stringify({ continue: true, status }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
