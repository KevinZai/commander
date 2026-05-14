#!/usr/bin/env node
/**
 * suggest-lightweight.js
 * Hook: Stop
 *
 * Renders a "💡 Try next:" 2-3 line suggestion block after every assistant turn.
 * Reuses project-state.json written by suggest-ticker.js (UserPromptSubmit).
 * Does NOT gather state itself — pure renderer.
 *
 * Modes via CCC_SUGGEST_MODE:
 *   smart    (DEFAULT) — render only when confidence >= CCC_SUGGEST_MIN_CONFIDENCE (default 0.8)
 *   always   — render every turn when state exists
 *   every-3  — render every 3rd turn
 *   every-5  — render every 5th turn
 *   off      — silent
 *
 * Legacy: CCC_SUGGEST_DISABLE=1 → same as mode=off
 *
 * Idempotency: hash of (project-state.json mtime + last 60s) stored in
 *   ~/.claude/commander/last-suggestion.json
 *
 * Hard timeout: 2000ms — process.exit(0) if exceeded.
 */

import { track } from '../lib/telemetry.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const CCC_DIR = path.join(HOME, '.claude', 'commander');
const STATE_FILE = path.join(CCC_DIR, 'project-state.json');
const LAST_SUGGESTION_FILE = path.join(CCC_DIR, 'last-suggestion.json');

const IDEMPOTENCY_WINDOW_MS = 60_000; // 60 seconds

// Hard timeout guard — exits cleanly rather than hanging the hook chain
const timeout = setTimeout(() => {
    track('hook_fired', { hook: 'Stop', handler: 'suggest-lightweight' });

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  process.exit(0);
}, 2000);
timeout.unref(); // don't prevent normal exit

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, filePath);
  } catch {
    // non-fatal
  }
}

function stateMtime() {
  try {
    return fs.statSync(STATE_FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function makeHash(mtime, turnCount) {
  return crypto
    .createHash('sha256')
    .update(`${mtime}:${turnCount}`)
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Turn counter (stored in last-suggestion.json)
// ---------------------------------------------------------------------------

function getTurnCount(lastSuggestion) {
  return (lastSuggestion && typeof lastSuggestion.turnCount === 'number')
    ? lastSuggestion.turnCount
    : 0;
}

// ---------------------------------------------------------------------------
// Mode logic
// ---------------------------------------------------------------------------

function getMode() {
  if (process.env.CCC_SUGGEST_DISABLE === '1') return 'off';
  const raw = (process.env.CCC_SUGGEST_MODE || 'smart').toLowerCase().trim();
  if (['smart', 'always', 'every-3', 'every-5', 'off'].includes(raw)) return raw;
  return 'smart';
}

function shouldRenderForMode(mode, turnCount) {
  switch (mode) {
    case 'off':    return false;
    case 'always': return true;
    case 'every-3': return turnCount % 3 === 0;
    case 'every-5': return turnCount % 5 === 0;
    case 'smart':  return true; // confidence gate applied separately
    default:       return false;
  }
}

// ---------------------------------------------------------------------------
// Confidence calculation
// ---------------------------------------------------------------------------

function computeConfidence(state) {
  const suggestions = [];
  let confidence = 0.4; // baseline: no clear signal

  const ahead = state.aheadMain ?? state.ahead ?? 0;
  const behind = state.behindMain ?? state.behind ?? 0;
  const tests = state.testsStatus ?? state.tests ?? 'unknown';
  const lastSkill = state.lastRecommendation?.skill ?? state.lastSkill ?? '';
  const blockers = Array.isArray(state.blockers)
    ? state.blockers.length
    : (state.securityAlerts ?? 0) + (state.lintErrors > 10 ? 1 : 0);
  const openTodos = state.openTodos ?? 0;
  const ciStatus = state.ciStatus ?? 'unknown';

  // Tier 1 signals
  if (ahead >= 2 && (tests === 'green' || tests === 'passing')) {
    confidence = 0.9;
    suggestions.push({ skill: '/ccc-ship', reason: 'branch ahead by ≥2 commits and tests are green' });
  }

  if (behind > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-review', reason: 'branch is behind main — sync before adding features' });
  }

  if (blockers > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-doctor', reason: `${blockers} open blocker(s) detected — investigate first` });
  }

  if (ciStatus === 'failing' && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-review', reason: 'CI is failing — review and fix before shipping' });
  }

  // Pipeline progression heuristic
  if (confidence < 0.86 && lastSkill) {
    const pipeline = ['/ccc-plan', '/ccc-build', '/ccc-review', '/ccc-ship'];
    const idx = pipeline.findIndex(s => lastSkill.includes(s.replace('/', '')));
    if (idx !== -1 && idx < pipeline.length - 1) {
      const next = pipeline[idx + 1];
      if (!suggestions.find(s => s.skill === next)) {
        confidence = Math.max(confidence, 0.85);
        suggestions.push({ skill: next, reason: `natural next step after ${pipeline[idx]}` });
      }
    }
  }

  // Open todos nudge
  if (openTodos > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.82);
    if (!suggestions.find(s => s.skill === '/ccc-plan')) {
      suggestions.push({ skill: '/ccc-plan', reason: `${openTodos} open todo(s) — resume the plan` });
    }
  }

  // Cap suggestions at 3
  return { confidence, suggestions: suggestions.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderSuggestions(suggestions) {
  if (suggestions.length === 0) return '';
  const lines = ['💡 Try next:'];
  for (const s of suggestions) {
    // Truncate reason to ~60 chars if needed
    const reason = s.reason.length > 60 ? s.reason.slice(0, 57) + '...' : s.reason;
    lines.push(`  ${s.skill} — ${reason}`);
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const mode = getMode();

  // Silent mode — fast exit
  if (mode === 'off') {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Read project state — missing file = graceful no-op
  const state = readJson(STATE_FILE);
  if (!state) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Load last-suggestion state
  const lastSuggestion = readJson(LAST_SUGGESTION_FILE);
  const newTurnCount = getTurnCount(lastSuggestion) + 1;

  // Mode-based render gate
  if (!shouldRenderForMode(mode, newTurnCount)) {
    // Still write the updated turn count so every-N counting stays accurate
    writeJson(LAST_SUGGESTION_FILE, {
      ...(lastSuggestion || {}),
      turnCount: newTurnCount,
    });
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Idempotency check (smart + always modes)
  const mtime = stateMtime();
  const hash = makeHash(mtime, Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS));

  if (lastSuggestion && lastSuggestion.hash === hash) {
    // Same hash within the 60s window — skip
    writeJson(LAST_SUGGESTION_FILE, {
      ...lastSuggestion,
      turnCount: newTurnCount,
    });
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Confidence calculation
  const minConfidence = parseFloat(
    process.env.CCC_SUGGEST_MIN_CONFIDENCE || '0.8'
  );
  const { confidence, suggestions } = computeConfidence(state);

  // Smart mode: gate on confidence
  if (mode === 'smart' && confidence < minConfidence) {
    writeJson(LAST_SUGGESTION_FILE, {
      hash,
      timestamp: Date.now(),
      turnCount: newTurnCount,
      rendered: false,
      confidence,
    });
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Always: render even if no suggestions (but only if suggestions exist)
  if (suggestions.length === 0) {
    writeJson(LAST_SUGGESTION_FILE, {
      hash,
      timestamp: Date.now(),
      turnCount: newTurnCount,
      rendered: false,
      confidence,
    });
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    return;
  }

  // Render
  const output = renderSuggestions(suggestions);

  writeJson(LAST_SUGGESTION_FILE, {
    hash,
    timestamp: Date.now(),
    turnCount: newTurnCount,
    rendered: true,
    confidence,
    suggestions,
  });

  process.stdout.write(
    JSON.stringify({
      continue: true,
      suppressOutput: false,
      status: output.trimEnd(),
    }) + '\n'
  );
}

main();
