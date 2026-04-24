#!/usr/bin/env node
/**
 * permission-denied.js
 * Hook: PermissionDenied
 *
 * Logs denied permissions for retrospective analysis + settings optimization.
 * Records tool name, session id, and input-length summary (never full content).
 *
 * Free forever — no license check, no tier gating.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');

async function main() {
  try {
    const toolName = process.env.CLAUDE_TOOL_NAME || 'unknown';
    const toolInput = process.env.CLAUDE_TOOL_INPUT || '{}';
    const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      toolName,
      // Log tool input summary but not full content (may contain secrets)
      inputLength: toolInput.length,
    };

    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'permission-denied.jsonl'),
      JSON.stringify(entry) + '\n'
    );

    // Future: suggest adding to allowlist if same tool denied 3+ times
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
