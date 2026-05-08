#!/usr/bin/env node
/**
 * elicitation-result-handler.js
 * Hook: ElicitationResult
 * Records user response pattern (matched/declined/cancelled) to session knowledge base.
 * Never blocks — no-op on any failure.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const ELICITATION_RESULTS_FILE = join(KNOWLEDGE_DIR, 'elicitation-results.jsonl');

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

  try {
    await mkdir(KNOWLEDGE_DIR, { recursive: true });

    // Determine response pattern from result data
    const result = input.result || input.response || {};
    let pattern = 'unknown';
    if (result.action === 'cancel' || result.cancelled === true) {
      pattern = 'cancelled';
    } else if (result.action === 'decline' || result.declined === true) {
      pattern = 'declined';
    } else if (result.value !== undefined || result.matched === true) {
      pattern = 'matched';
    }

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
      requestId: input.request_id || input.requestId || null,
      pattern,
      resultType: result.type || null,
    };
    await appendFile(ELICITATION_RESULTS_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // fail silently — never block session
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
