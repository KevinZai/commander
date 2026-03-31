// ============================================================================
// Kevin Z's CC Commander — Context Rot Monitor (PostToolUse)
// ============================================================================
// Monitors context window fill level and emits tiered warnings via stderr.
// Reads context percentage from hook input or CC_CONTEXT_PCT env var.
// Tracks last warning level to avoid repeating the same tier.
//
// Env vars:
//   CC_CONTEXT_ROT_DISABLE=1   Skip entirely
//   CC_CONTEXT_PCT             Fallback context percentage (0-100)
//
// State file: ~/.claude/.context-rot-last
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = path.join(os.homedir(), '.claude', '.context-rot-last');

const TIERS = [
  { threshold: 90, level: 4, msg: '\u{1F6A8} Context at 90% \u2014 SAVE SESSION IMMEDIATELY, context loss imminent' },
  { threshold: 85, level: 3, msg: '\u{1F534} Context at 85% \u2014 strongly recommend /save-session NOW' },
  { threshold: 75, level: 2, msg: '\u26A0\uFE0F Context at 75% \u2014 run /save-session or /compact soon' },
  { threshold: 60, level: 1, msg: '\u{1F4A1} Context at 60% \u2014 consider saving key decisions' },
];

function readLastLevel() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8').trim();
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

function writeLastLevel(level) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, String(level));
  } catch {
    // Not critical
  }
}

function extractContextPct(input) {
  // Try multiple paths in the hook input
  try {
    if (input?.session?.context_window?.used_percentage != null) {
      return input.session.context_window.used_percentage;
    }
  } catch { /* ignore */ }

  try {
    if (input?.session?.contextWindow?.usedPercentage != null) {
      return input.session.contextWindow.usedPercentage;
    }
  } catch { /* ignore */ }

  try {
    if (input?.context_percentage != null) {
      return input.context_percentage;
    }
  } catch { /* ignore */ }

  try {
    if (input?.contextPercentage != null) {
      return input.contextPercentage;
    }
  } catch { /* ignore */ }

  // Fallback to env var
  const envPct = process.env.CC_CONTEXT_PCT;
  if (envPct) {
    const parsed = parseFloat(envPct);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  }

  return null;
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  // Always pass through
  console.log(data);

  try {
    // Bail if disabled
    if (process.env.CC_CONTEXT_ROT_DISABLE === '1') return;

    const input = JSON.parse(data);
    const pct = extractContextPct(input);

    if (pct === null) return;

    // Find the highest matching tier
    const matchedTier = TIERS.find(t => pct >= t.threshold) || null;

    if (!matchedTier) {
      // Below all thresholds — reset state so next climb triggers fresh
      writeLastLevel(0);
      return;
    }

    const lastLevel = readLastLevel();

    // Only warn if we've crossed into a new (higher) tier
    if (matchedTier.level > lastLevel) {
      process.stderr.write(`[context-rot-monitor] ${matchedTier.msg}\n`);
      writeLastLevel(matchedTier.level);
    }
  } catch {
    // Silent fail — never block tool execution
  }
});
