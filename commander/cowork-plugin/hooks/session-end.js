#!/usr/bin/env node
/**
 * session-end.js
 * Hook: SessionEnd (maps to Stop event)
 * Free tier: no-op stub (exits 0)
 * Pro tier: persists session learning to knowledge DB for compounding intelligence
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const LICENSE_FILE = join(CCC_DIR, 'license.json');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');

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

    // Pro tier: persist session learning to knowledge DB
    const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;
    const activeSessionFile = join(CCC_DIR, 'sessions', 'active-session.json');

    let sessionData = {};
    try {
      sessionData = JSON.parse(await readFile(activeSessionFile, 'utf8'));
    } catch {
      // No session data — nothing to persist
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    // Write session summary to knowledge directory
    await mkdir(KNOWLEDGE_DIR, { recursive: true });
    const summary = {
      sessionId,
      endedAt: new Date().toISOString(),
      startedAt: sessionData.startedAt,
      tier: sessionData.tier,
      // Future: add task completions, patterns learned, corrections made
    };

    await writeFile(
      join(KNOWLEDGE_DIR, `session-${sessionId}.json`),
      JSON.stringify(summary, null, 2)
    );

    // Mark session as complete
    try {
      await writeFile(activeSessionFile, JSON.stringify({ ...sessionData, status: 'complete', endedAt: summary.endedAt }, null, 2));
    } catch {}

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
