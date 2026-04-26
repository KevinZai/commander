#!/usr/bin/env node
/**
 * session-end.js
 * Hook: SessionEnd (maps to Stop event)
 *
 * Persists session learning to ~/.claude/commander/knowledge/ for
 * compounding intelligence across sessions.
 *
 * Free forever — no license check, no tier gating.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');

async function main() {
  try {
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
