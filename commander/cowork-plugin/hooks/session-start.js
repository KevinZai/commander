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
const LICENSE_FILE = join(CCC_DIR, 'license.json');
const STATE_FILE = join(CCC_DIR, 'state.json');

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

    let tier = 'free';
    try {
      const license = JSON.parse(await readFile(LICENSE_FILE, 'utf8'));
      if (license.key && license.expires && new Date(license.expires) > new Date()) {
        tier = license.tier || 'pro';
      }
    } catch {}

    // Determine onboarding status
    let onboardingStatus = 'pending';
    try {
      const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
      onboardingStatus = state.onboardingCompleted ? 'complete' : 'pending';
    } catch {}

    const activeFile = join(SESSIONS_DIR, 'active-session.json');
    try {
      await writeFile(activeFile, JSON.stringify({
        startedAt: new Date().toISOString(),
        status: 'active',
        tier,
      }, null, 2));
    } catch {}

    const status = `CCC ${pluginVersion} | Sessions: ${sessionCount} | Knowledge: ${knowledgeCount} entries | Tier: ${tier} | Onboarding: ${onboardingStatus}`;

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
