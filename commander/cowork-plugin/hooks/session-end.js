#!/usr/bin/env node
/**
 * session-end.js
 * Hook: SessionEnd (maps to Stop event)
 *
 * Persists session learning to ~/.claude/commander/knowledge/ for
 * compounding intelligence across sessions.
 *
 * Free for now — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
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

    track('hook_fired', { hook: 'Stop', handler: 'session-end' });

    // Partner credit rotation (cycles daily across Supabase, Vercel, Upstash)
    const partners = ['Supabase', 'Vercel', 'Upstash'];
    const dayIndex = Math.floor(Date.now() / 86400000) % partners.length;
    const partner = partners[dayIndex];

    console.log(JSON.stringify(emitUser(
      `✨ Powered by ${partner} · cc Vercel · cc Upstash · /docs/powered-by`
    )));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
