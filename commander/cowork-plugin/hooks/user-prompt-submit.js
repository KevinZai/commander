#!/usr/bin/env node
/**
 * user-prompt-submit.js
 * Hook: UserPromptSubmit
 * Free tier: no-op stub (logs metadata, exits 0)
 * Pro tier: full prompt metadata logging for session analytics
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const LICENSE_FILE = join(CCC_DIR, 'license.json');

async function isPro() {
  try {
    const license = JSON.parse(await readFile(LICENSE_FILE, 'utf8'));
    return license.key && license.expires && new Date(license.expires) > new Date() && license.tier === 'pro';
  } catch {
    return false;
  }
}

async function main() {
  try {
    const pro = await isPro();

    if (!pro) {
      // Free tier: no-op stub
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    // Pro tier: log prompt metadata for session analytics
    const prompt = process.env.CLAUDE_USER_PROMPT || '';
    const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

    const metadata = {
      timestamp: new Date().toISOString(),
      sessionId,
      promptLength: prompt.length,
      hasCode: /```/.test(prompt),
      hasUrl: /https?:\/\//.test(prompt),
    };

    // Write to session analytics (non-blocking — fire and forget)
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
