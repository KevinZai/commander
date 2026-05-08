#!/usr/bin/env node
/**
 * agent-run-logger.js
 * Hook: SubagentStop
 *
 * Appends a JSONL observability record for each completed specialist agent to
 * ~/.claude/commander/agent-runs.jsonl
 *
 * Record shape:
 *   { ts, agent, sessionId, durationMs, inputTokens, outputTokens, status }
 *
 * Rotation: if agent-runs.jsonl exceeds 10MB, renames it to
 *   agent-runs.YYYY-MM-DD.jsonl and starts a fresh file.
 *
 * Free for now — no license check, no tier gating.
 */
import { appendFile, mkdir, stat, rename } from 'node:fs/promises';
import { join } from 'node:path';

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const CCC_DIR = join(HOME, '.claude', 'commander');
const LOG_FILE = join(CCC_DIR, 'agent-runs.jsonl');
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

async function rotateLogs() {
  try {
    const info = await stat(LOG_FILE);
    if (info.size >= MAX_BYTES) {
      const now = new Date();
      const datestamp =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0');
      const rotatedPath = join(CCC_DIR, `agent-runs.${datestamp}.jsonl`);
      await rename(LOG_FILE, rotatedPath);
    }
  } catch {
    // File doesn't exist yet or stat failed — that's fine
  }
}

async function main() {
  try {
    const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
    const agentName =
      process.env.CLAUDE_AGENT_NAME ||
      process.env.CLAUDE_SUBAGENT_NAME ||
      'unknown';
    const inputTokens = parseInt(
      process.env.CLAUDE_INPUT_TOKENS || process.env.CLAUDE_TOKENS_INPUT || '0',
      10
    );
    const outputTokens = parseInt(
      process.env.CLAUDE_OUTPUT_TOKENS || process.env.CLAUDE_TOKENS_OUTPUT || '0',
      10
    );
    const durationMs = parseInt(
      process.env.CLAUDE_DURATION_MS || process.env.CLAUDE_ELAPSED_MS || '0',
      10
    );
    const status =
      process.env.CLAUDE_STOP_REASON ||
      process.env.CLAUDE_SUBAGENT_STATUS ||
      'completed';

    const entry = {
      ts: new Date().toISOString(),
      agent: agentName,
      sessionId,
      durationMs,
      inputTokens,
      outputTokens,
      status,
    };

    await mkdir(CCC_DIR, { recursive: true });
    await rotateLogs();
    await appendFile(LOG_FILE, JSON.stringify(entry) + '\n');

    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }) + '\n'
    );
  } catch {
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }) + '\n'
    );
  }
}

main();
