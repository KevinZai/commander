#!/usr/bin/env node
// License-tier gate removed 2026-04-23 — CC Commander is free forever.
/**
 * user-prompt-submit.js
 * Hook: UserPromptSubmit
 * Logs prompt metadata for session analytics.
 */
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');

async function main() {
  try {
    const prompt = process.env.CLAUDE_USER_PROMPT || '';
    const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

    const metadata = {
      timestamp: new Date().toISOString(),
      sessionId,
      promptLength: prompt.length,
      hasCode: /```/.test(prompt),
      hasUrl: /https?:\/\//.test(prompt),
    };

    const { appendFile, mkdir } = await import('node:fs/promises');
    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'prompt-metadata.jsonl'),
      JSON.stringify(metadata) + '\n'
    );

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
