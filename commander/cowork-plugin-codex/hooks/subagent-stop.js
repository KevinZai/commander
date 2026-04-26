#!/usr/bin/env node
/**
 * subagent-stop.js
 * Hook: SubagentStop
 *
 * Tracks subagent cost aggregation per session to
 * ~/.claude/commander/analytics/subagent-costs.jsonl
 *
 * Free forever — no license check, no tier gating.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');

async function main() {
  try {
    const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
    const agentName = process.env.CLAUDE_AGENT_NAME || 'unknown';
    const inputTokens = parseInt(process.env.CLAUDE_INPUT_TOKENS || '0', 10);
    const outputTokens = parseInt(process.env.CLAUDE_OUTPUT_TOKENS || '0', 10);

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      agentName,
      inputTokens,
      outputTokens,
    };

    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'subagent-costs.jsonl'),
      JSON.stringify(entry) + '\n'
    );

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
