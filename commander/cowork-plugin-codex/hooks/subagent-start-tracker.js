#!/usr/bin/env node
/**
 * subagent-start-tracker.js
 * Hook: SubagentStart
 * Records agent dispatch to ~/.claude/commander/fleet/dispatch-log.jsonl
 * for fleet visibility. Gracefully handles absent env vars.
 * Never blocks — no-op on any failure.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const FLEET_DIR = join(CCC_DIR, 'fleet');
const DISPATCH_LOG = join(FLEET_DIR, 'dispatch-log.jsonl');

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
    await mkdir(FLEET_DIR, { recursive: true });

    // Env vars may not be populated — default gracefully
    const agentName = process.env.CLAUDE_AGENT_NAME
      || input.agent_name
      || input.agentName
      || 'unknown';

    const taskPreview = process.env.CLAUDE_AGENT_PROMPT
      || input.prompt
      || input.task
      || '';

    const model = process.env.CLAUDE_MODEL
      || input.model
      || 'unknown';

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
      agentName,
      model,
      taskPreview: taskPreview.slice(0, 200), // cap preview length
    };

    await appendFile(DISPATCH_LOG, JSON.stringify(entry) + '\n');
  } catch {
    // fail silently — never block session
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
