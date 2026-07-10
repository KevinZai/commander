#!/usr/bin/env node
/**
 * suggest-lightweight.js
 * Hook: Stop
 *
 * Renders a suggestion block after assistant turns, honoring the involvement
 * level suggest-ticker.js recorded in project-state.json (recommendedLevel,
 * per ccc-suggest/SKILL.md):
 *   L1 (passive)   — log-only: computes + records the suggestion, renders nothing
 *   L2 (gentle)    — "💡 Try next:" one-to-three-liner at the bottom
 *   L3+ (assertive) — boxed 🎯 recommendation card with confidence + why + alternatives
 *
 * Reuses project-state.json written by suggest-ticker.js (UserPromptSubmit)
 * and the shared confidence engine in lib/confidence.mjs (which also folds in
 * the retired session-coach ext→domain heuristics via state.stack).
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

import { track } from '../lib/telemetry.mjs';
import { emitUser, emitSilent } from './lib/emit.mjs';
import { computeConfidence } from './lib/confidence.mjs';
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
// Involvement level (recommendedLevel from suggest-ticker.js)
// ---------------------------------------------------------------------------

function getLevel(state) {
  const lvl = parseInt(state.recommendedLevel, 10);
  if (!isNaN(lvl) && lvl >= 1 && lvl <= 4) return lvl;
  return 2; // gentle nudge by default
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

/** Level 3 boxed card per ccc-suggest/SKILL.md — confidence + why + alternatives. */
function renderBoxedCard(suggestions, confidence) {
  if (suggestions.length === 0) return '';
  const top = suggestions[0];
  const alternatives = suggestions.slice(1).map(s => s.skill).join(' · ');
  const confLabel = confidence >= 0.85 ? 'HIGH' : confidence >= 0.7 ? 'MEDIUM' : 'LOW';

  const body = [
    `⭐ ${top.skill} (${confLabel} confidence)`,
    `Why: ${top.reason}`,
  ];
  if (alternatives) body.push(`Alternatives: ${alternatives}`);

  const width = Math.max(...body.map(l => l.length), 44);
  const top_ = `┌─ 🎯 CC Commander Suggests ${'─'.repeat(Math.max(1, width - 25))}┐`;
  const bottom = `└${'─'.repeat(top_.length - 2)}┘`;
  const lines = [top_];
  for (const l of body) lines.push(`│ ${l.padEnd(width)} │`);
  lines.push(bottom);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const mode = getMode();

  // Silent mode — fast exit
  if (mode === 'off') {
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
    return;
  }

  // Read project state — missing file = graceful no-op
  const state = readJson(STATE_FILE);
  if (!state) {
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
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
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
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
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
    return;
  }

  // Confidence calculation — shared engine (lib/confidence.mjs)
  const minConfidence = parseFloat(
    process.env.CCC_SUGGEST_MIN_CONFIDENCE || '0.8'
  );
  const { confidence, suggestions } = computeConfidence(state);
  const level = getLevel(state);

  // Smart mode: gate on confidence
  if (mode === 'smart' && confidence < minConfidence) {
    writeJson(LAST_SUGGESTION_FILE, {
      hash,
      timestamp: Date.now(),
      turnCount: newTurnCount,
      rendered: false,
      confidence,
    });
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
    return;
  }

  // No suggestions → nothing to render regardless of mode/level
  if (suggestions.length === 0) {
    writeJson(LAST_SUGGESTION_FILE, {
      hash,
      timestamp: Date.now(),
      turnCount: newTurnCount,
      rendered: false,
      confidence,
    });
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
    return;
  }

  // Level 1 (passive): record the suggestion for /ccc-suggest but render nothing
  if (level <= 1) {
    writeJson(LAST_SUGGESTION_FILE, {
      hash,
      timestamp: Date.now(),
      turnCount: newTurnCount,
      rendered: false,
      level,
      confidence,
      suggestions,
    });
    process.stdout.write(JSON.stringify(emitSilent()) + '\n');
    return;
  }

  // Level 2 (gentle) → bottom one-liner block · Level 3+ (assertive) → boxed card
  const output = level >= 3
    ? renderBoxedCard(suggestions, confidence)
    : renderSuggestions(suggestions);

  writeJson(LAST_SUGGESTION_FILE, {
    hash,
    timestamp: Date.now(),
    turnCount: newTurnCount,
    rendered: true,
    level,
    confidence,
    suggestions,
  });

  process.stdout.write(JSON.stringify(emitUser(output.trimEnd())) + '\n');
}

main();
