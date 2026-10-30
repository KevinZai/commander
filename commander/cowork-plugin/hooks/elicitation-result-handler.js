#!/usr/bin/env node
/**
 * elicitation-result-handler.js
 * Hook: ElicitationResult
 * Logs the user's answer to an MCP elicitation (accept/decline/cancel).
 * Documented input (code.claude.com/docs/en/hooks#elicitationresult-input):
 * mcp_server_name, action, and optional mode, elicitation_id, content.
 * content holds the submitted values (possibly credentials) and is never
 * logged; absent optional fields are omitted.
 * Logs outcome best-effort. Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const LOG_DIR = stateDir();
const LOG_FILE = path.join(LOG_DIR, 'elicitation.jsonl');
const LOGGED_FIELDS = ['session_id', 'mcp_server_name', 'mode', 'elicitation_id'];
const ACTIONS = new Set(['accept', 'decline', 'cancel']);

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
    const entry = { ts: new Date().toISOString(), event: 'ElicitationResult' };
    if (ACTIONS.has(input.action)) entry.action = input.action;
    for (const k of LOGGED_FIELDS) {
      if (typeof input[k] === 'string' && input[k]) entry[k] = input[k];
    }
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort logging — never fail the session
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
