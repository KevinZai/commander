#!/usr/bin/env node
/**
 * permission-denied.js
 * Hook: PermissionDenied
 * Free tier: no-op stub (exits 0)
 * Pro tier: logs denied permissions for retrospective analysis and settings optimization
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

    // Pro tier: log denied permission for retrospective analysis
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
