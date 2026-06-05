#!/usr/bin/env node
/**
 * prompt-expansion-guard.js
 * Hook: UserPromptExpansion
 * Pass-through guard for prompt expansion events.
 * Never blocks — always exits 0 with {continue:true}.
 */
import process from 'node:process';

async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) JSON.parse(raw); // validate but discard
  } catch {
    // Malformed input — still continue
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
