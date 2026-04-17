#!/usr/bin/env node
/**
 * subagent-stop.js
 * Hook: SubagentStop
 * Free tier: no-op stub (exits 0)
 * Pro tier: tracks subagent cost aggregation per session
 */
import { readFile, appendFile, mkdir } from 'node:fs/promises';
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

    // Pro tier: aggregate subagent cost tracking
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
