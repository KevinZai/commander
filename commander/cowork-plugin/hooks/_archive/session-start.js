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
import { readablePath, stateDir } from '../../lib/lane-state.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This file lives in hooks/_archive/, so the plugin root is two levels up and
// the repo root four. The old paths (one/three levels up) predate the move to
// _archive/ and never resolved, so the banner fell back to 'CCC 4.0.0' (#209).
const PLUGIN_ROOT = join(import.meta.dirname, '..', '..');
const PKG_JSON = join(PLUGIN_ROOT, '..', '..', 'package.json');

// Claude plugin ships .claude-plugin/plugin.json; the generated Codex build
// (cowork-plugin-codex) ships .codex-plugin/plugin.json instead.
const PLUGIN_JSON = [
  join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'),
  join(PLUGIN_ROOT, '.codex-plugin', 'plugin.json'),
].find((p) => existsSync(p)) || join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');

/**
 * Pure-function entry for orchestrator (CC-414 hook chain merge).
 * Returns the output JSON object instead of writing to stdout.
 * Caller may pass { home, cwd } overrides; defaults read from process.env / process.cwd().
 */
export async function run({ home, cwd: _cwd } = {}) {
  const laneEnv = home ? { ...process.env, HOME: home } : process.env;
  const CCC_DIR = stateDir(laneEnv);
  const SESSIONS_DIR = join(CCC_DIR, 'sessions');
  const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
  const STATE_FILE = join(CCC_DIR, 'state.json');
  // Read the legacy ~/.claude/commander/state.json until this lane has its own copy.
  const STATE_SRC = readablePath('state.json', laneEnv);

  try {
    for (const dir of [CCC_DIR, SESSIONS_DIR, KNOWLEDGE_DIR]) {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    }

    let pluginVersion = 'unknown';
    try {
      const pluginJson = JSON.parse(await readFile(PLUGIN_JSON, 'utf8'));
      pluginVersion = pluginJson.version || pluginVersion;
    } catch {}

    let packageVersion = pluginVersion;
    try {
      const pkgJson = JSON.parse(await readFile(PKG_JSON, 'utf8'));
      packageVersion = pkgJson.version || packageVersion;
    } catch {}

    const isFirstRun = !existsSync(STATE_SRC);
    if (isFirstRun) {
      try {
        await writeFile(STATE_FILE, JSON.stringify({
          onboardingCompleted: false,
          firstRunAt: new Date().toISOString(),
          installedVersion: pluginVersion,
          last_seen_version: packageVersion === 'unknown' ? null : packageVersion,
        }, null, 2));
      } catch {}
    }

    const sessions = await readdir(SESSIONS_DIR).catch(() => []);
    const sessionCount = sessions.filter(f => f.endsWith('.json')).length;

    const knowledge = await readdir(KNOWLEDGE_DIR).catch(() => []);
    const knowledgeCount = knowledge.length;

    let onboardingCompleted = false;
    let versionTransition = false;
    try {
      const state = JSON.parse(await readFile(STATE_SRC, 'utf8'));
      onboardingCompleted = !!state.onboardingCompleted;
      const lastSeen = state.last_seen_version;
      // 'unknown' (no manifest found) is no signal: no nudge, never stored as last_seen_version.
      if (!isFirstRun && packageVersion !== 'unknown' && lastSeen && lastSeen !== packageVersion) {
        versionTransition = true;
        const updated = { ...state, last_seen_version: packageVersion };
        await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
      } else if (!isFirstRun && packageVersion !== 'unknown' && !lastSeen) {
        const updated = { ...state, last_seen_version: packageVersion };
        await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
      }
    } catch {}

    const activeFile = join(SESSIONS_DIR, 'active-session.json');
    try {
      await writeFile(activeFile, JSON.stringify({
        startedAt: new Date().toISOString(),
        status: 'active',
      }, null, 2));
    } catch {}

    // First run = CCC's own state.json did not exist before this session, not
    // an empty ~/.claude/sessions (anyone who used Claude Code before
    // installing CCC never saw the welcome; CC-1360 F24).
    if (!onboardingCompleted && isFirstRun) {
      return {
        continue: true,
        suppressOutput: false,
        status: '👋 Welcome to CC Commander! Run /ccc-start for a 60-second tour.',
      };
    }

    if (versionTransition) {
      return {
        continue: true,
        suppressOutput: false,
        status: `CC Commander updated to ${packageVersion}. Run /ccc-changelog to see what's new.`,
      };
    }

    const onboardingStatus = onboardingCompleted ? 'complete' : 'pending';
    const status = `CCC ${pluginVersion} | Sessions: ${sessionCount} | Knowledge: ${knowledgeCount} entries | Onboarding: ${onboardingStatus}`;

    return { continue: true, suppressOutput: false, status };
  } catch {
    return { continue: true, suppressOutput: true };
  }
}

const CCC_DIR = stateDir();
const SESSIONS_DIR = join(CCC_DIR, 'sessions');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const STATE_FILE = join(CCC_DIR, 'state.json');
const STATE_SRC = readablePath('state.json');

async function main() {
  try {
    for (const dir of [CCC_DIR, SESSIONS_DIR, KNOWLEDGE_DIR]) {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    }

    // Read plugin version
    let pluginVersion = 'unknown';
    try {
      const pluginJson = JSON.parse(await readFile(PLUGIN_JSON, 'utf8'));
      pluginVersion = pluginJson.version || pluginVersion;
    } catch {}

    // Read current package version (authoritative source for version transitions)
    let packageVersion = pluginVersion;
    try {
      const pkgJson = JSON.parse(await readFile(PKG_JSON, 'utf8'));
      packageVersion = pkgJson.version || packageVersion;
    } catch {}

    // Seed state.json on first run (idempotent — never clobber existing state)
    const isFirstRun = !existsSync(STATE_SRC);
    if (isFirstRun) {
      try {
        await writeFile(STATE_FILE, JSON.stringify({
          onboardingCompleted: false,
          firstRunAt: new Date().toISOString(),
          installedVersion: pluginVersion,
          last_seen_version: packageVersion === 'unknown' ? null : packageVersion,
        }, null, 2));
      } catch {}
    }

    const sessions = await readdir(SESSIONS_DIR).catch(() => []);
    const sessionCount = sessions.filter(f => f.endsWith('.json')).length;

    const knowledge = await readdir(KNOWLEDGE_DIR).catch(() => []);
    const knowledgeCount = knowledge.length;

    // Determine onboarding status and version-transition
    let onboardingCompleted = false;
    let versionTransition = false;
    try {
      const state = JSON.parse(await readFile(STATE_SRC, 'utf8'));
      onboardingCompleted = !!state.onboardingCompleted;
      const lastSeen = state.last_seen_version;
      // 'unknown' (no manifest found) is no signal: no nudge, never stored as last_seen_version.
      if (!isFirstRun && packageVersion !== 'unknown' && lastSeen && lastSeen !== packageVersion) {
        versionTransition = true;
        // Update last_seen_version so nudge only fires once per upgrade
        const updated = { ...state, last_seen_version: packageVersion };
        await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
      } else if (!isFirstRun && packageVersion !== 'unknown' && !lastSeen) {
        // Backfill field for existing installs — treat as no transition
        const updated = { ...state, last_seen_version: packageVersion };
        await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
      }
    } catch {}

    // Detect if this is the user's first-ever Claude session (no prior session history)
    const activeFile = join(SESSIONS_DIR, 'active-session.json');
    try {
      await writeFile(activeFile, JSON.stringify({
        startedAt: new Date().toISOString(),
        status: 'active',
      }, null, 2));
    } catch {}

    // Auto-prompt /ccc-start on CCC's first run when onboarding is not completed
    if (!onboardingCompleted && isFirstRun) {
      console.log(JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: '👋 Welcome to CC Commander! Run /ccc-start for a 60-second tour.',
      }));
      return;
    }

    // Version-transition nudge — fires once per upgrade, never on first run
    if (versionTransition) {
      console.log(JSON.stringify({
        continue: true,
        suppressOutput: false,
        status: `CC Commander updated to ${packageVersion}. Run /ccc-changelog to see what's new.`,
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

// Only run when invoked directly (preserve standalone behavior)
const __isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (__isMain) main();
