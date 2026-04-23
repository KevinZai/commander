#!/usr/bin/env node
/**
 * session-start.js
 * Hook: SessionStart
 * Initializes CCC session state: creates dirs, counts sessions/knowledge, detects tier.
 *
 * Prompt caching tip: Large CLAUDE.md loads benefit from `ENABLE_PROMPT_CACHING_1H=1` env var
 * — write 2x base, read 0.1x base, ~12x ROI across a workday of multiple sessions.
 * Set it in your shell profile or .env before launching Claude Code for significant cost savings.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const PLUGIN_JSON = join(import.meta.dirname, '..', '.claude-plugin', 'plugin.json');

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSIONS_DIR = join(CCC_DIR, 'sessions');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const STATE_FILE = join(CCC_DIR, 'state.json');
const CLAUDE_SESSIONS_DIR = join(process.env.HOME, '.claude', 'sessions');

async function main() {
  try {
    for (const dir of [CCC_DIR, SESSIONS_DIR, KNOWLEDGE_DIR]) {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    }

    // Read plugin version
    let pluginVersion = '4.0.0';
    try {
      const pluginJson = JSON.parse(await readFile(PLUGIN_JSON, 'utf8'));
      pluginVersion = pluginJson.version || pluginVersion;
    } catch {}

    // Seed state.json on first run (idempotent — never clobber existing state)
    if (!existsSync(STATE_FILE)) {
      try {
        await writeFile(STATE_FILE, JSON.stringify({
          onboardingCompleted: false,
          firstRunAt: new Date().toISOString(),
          installedVersion: pluginVersion,
        }, null, 2));
      } catch {}
    }

    const sessions = await readdir(SESSIONS_DIR).catch(() => []);
    const sessionCount = sessions.filter(f => f.endsWith('.json')).length;

    const knowledge = await readdir(KNOWLEDGE_DIR).catch(() => []);
    const knowledgeCount = knowledge.length;

    // Determine onboarding status
    let onboardingCompleted = false;
    try {
      const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
      onboardingCompleted = !!state.onboardingCompleted;
    } catch {}

    // Detect if this is the user's first-ever Claude session (no prior session history)
    let isFirstSession = false;
    try {
      const claudeSessions = await readdir(CLAUDE_SESSIONS_DIR).catch(() => []);
      isFirstSession = claudeSessions.length === 0;
    } catch {
      isFirstSession = true;
    }

    const activeFile = join(SESSIONS_DIR, 'active-session.json');
    try {
      await writeFile(activeFile, JSON.stringify({
        startedAt: new Date().toISOString(),
        status: 'active',
      }, null, 2));
    } catch {}

    // Auto-prompt /ccc-start on first session when onboarding not yet completed
    if (!onboardingCompleted && isFirstSession) {
      console.log(JSON.stringify({
        continue: true,
        suppressOutput: true,
        status: '👋 Welcome to CC Commander! Run /ccc-start for a 60-second tour.',
      }));
      return;
    }

    const onboardingStatus = onboardingCompleted ? 'complete' : 'pending';
    const status = `CCC ${pluginVersion} | Sessions: ${sessionCount} | Knowledge: ${knowledgeCount} entries | Onboarding: ${onboardingStatus}`;

    console.log(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status,
    }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
