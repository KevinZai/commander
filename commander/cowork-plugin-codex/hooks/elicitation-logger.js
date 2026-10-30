#!/usr/bin/env node
/**
 * elicitation-logger.js
 * Hook: Elicitation
 * Logs which MCP server asked for input, in which mode, for session observability.
 * Documented input (code.claude.com/docs/en/hooks#elicitation-input):
 * mcp_server_name, message, and optional mode, url, elicitation_id,
 * requested_schema. message, url and requested_schema can carry credentials or
 * tokens, so only identifiers are logged; absent optional fields are omitted.
 * Never blocks — always exits 0 with {continue:true}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const LOG_DIR = stateDir();
const LOG_FILE = path.join(LOG_DIR, 'elicitation.jsonl');
const LOGGED_FIELDS = ['session_id', 'mcp_server_name', 'mode', 'elicitation_id'];

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
    const entry = { ts: new Date().toISOString(), event: 'Elicitation' };
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
