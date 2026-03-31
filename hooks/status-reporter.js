#!/usr/bin/env node
// ============================================================================
// CC Commander — Status Reporter (PostToolUse)
// ============================================================================
// Tracks session activity and signals when a status update is due.
// Works with the status-updates skill to send progress reports via
// MCP channels (Slack, Discord, email).
//
// Environment variables:
//   CC_STATUS_UPDATES=1       Enable status reporting (or KZ_STATUS_UPDATES=1)
//   CC_STATUS_INTERVAL=30     Minutes between reports (default: 30)
//   CC_STATUS_CHANNEL=slack   Target channel (slack, discord, email)
//   CC_STATUS_LEVEL=brief     Detail level (brief, detailed)
//
// State file: /tmp/cc-status-{sessionId}.json
// Signal file: /tmp/cc-status-{sessionId}.signal (created when report due)
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Passthrough stdin → stdout (required for hook chain)
// ---------------------------------------------------------------------------
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(input);

  // Gate: check if status reporting is enabled
  const enabled =
    process.env.CC_STATUS_UPDATES === '1' ||
    process.env.KZ_STATUS_UPDATES === '1';
  if (!enabled) return;

  try {
    run();
  } catch {
    // Silent failure — never block the hook chain
  }
});

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------
function run() {
  // Parse input for session context
  let parsed = {};
  try {
    parsed = JSON.parse(input);
  } catch {
    return; // Can't parse, skip
  }

  // Resolve session ID
  const sessionId = parsed.session_id
    || process.env.CLAUDE_SESSION_ID
    || process.env.SESSION_ID
    || 'default';

  const stateFile = path.join(os.tmpdir(), `cc-status-${sessionId}.json`);
  const signalFile = path.join(os.tmpdir(), `cc-status-${sessionId}.signal`);

  // Read or initialize state
  let state = {
    startTime: Date.now(),
    lastReportTime: Date.now(),
    toolCallCount: 0,
    toolTypes: {},
    currentPhase: 'working',
    costEstimate: 0,
  };

  try {
    if (fs.existsSync(stateFile)) {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch {
    // Use default state
  }

  // Update state with this tool call
  state.toolCallCount++;
  const toolName = parsed.tool_name || parsed.tool || 'unknown';
  state.toolTypes[toolName] = (state.toolTypes[toolName] || 0) + 1;

  // Track cost if available
  if (parsed.cost) {
    state.costEstimate = parsed.cost;
  }

  // Check if interval has elapsed
  const intervalMinutes = parseInt(
    process.env.CC_STATUS_INTERVAL || process.env.KZ_STATUS_INTERVAL || '30',
    10
  );
  const intervalMs = intervalMinutes * 60 * 1000;
  const elapsed = Date.now() - state.lastReportTime;

  if (elapsed >= intervalMs) {
    // Write signal file for the skill to pick up
    const signal = {
      timestamp: new Date().toISOString(),
      sessionId,
      elapsed: Date.now() - state.startTime,
      toolCallCount: state.toolCallCount,
      topTools: Object.entries(state.toolTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      costEstimate: state.costEstimate,
      channel: process.env.CC_STATUS_CHANNEL || process.env.KZ_STATUS_CHANNEL || 'auto',
      level: process.env.CC_STATUS_LEVEL || process.env.KZ_STATUS_LEVEL || 'brief',
    };

    try {
      fs.writeFileSync(signalFile, JSON.stringify(signal, null, 2));
    } catch {
      // Silent
    }

    state.lastReportTime = Date.now();

    // Emit notification on stderr
    const t = getColors();
    const mins = Math.floor((Date.now() - state.startTime) / 60000);
    process.stderr.write(
      `${t.dim}━━${t.reset} ${t.primary}CC STATUS${t.reset} ` +
      `${t.secondary}Update due (${mins}m elapsed, ${state.toolCallCount} tools)${t.reset}\n`
    );
  }

  // Save state
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch {
    // Silent
  }
}

// ---------------------------------------------------------------------------
// Colors (uses theme if available, falls back to claude defaults)
// ---------------------------------------------------------------------------
function getColors() {
  try {
    const { getSafeTheme } = require(path.join(__dirname, '..', 'lib', 'themes.js'));
    return getSafeTheme();
  } catch {
    return {
      primary: '\x1b[38;5;172m',
      secondary: '\x1b[38;5;145m',
      dim: '\x1b[38;5;240m',
      accent: '\x1b[38;5;99m',
      reset: '\x1b[0m',
    };
  }
}
