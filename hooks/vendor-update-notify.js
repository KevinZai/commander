'use strict';

// Hook: vendor-update-notify
// Type: SessionStart
// Purpose: Weekly vendor/upstream check reminder

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.env.HOME, '.claude', 'commander', 'vendor-check-state.json');
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function loadState() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STATE_FILE)) return { lastCheck: null };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastCheck: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function handle() {
  const state = loadState();
  const now = Date.now();
  const lastCheck = state.lastCheck ? new Date(state.lastCheck).getTime() : 0;
  const elapsed = now - lastCheck;

  if (elapsed < ONE_WEEK_MS) return;

  const daysSince = lastCheck ? Math.floor(elapsed / (24 * 60 * 60 * 1000)) : null;
  const timeMsg = daysSince ? `${daysSince} days since last check` : 'Never checked';

  const message = [
    '',
    `[vendor-update-notify] Weekly vendor check due (${timeMsg})`,
    '  Run: /ccc-xray to scan for upstream updates',
    '  Or:  ccc -> Vendor Scanner to check for new tools',
    '',
  ].join('\n');

  process.stderr.write(message);

  state.lastCheck = new Date().toISOString();
  saveState(state);
}

module.exports = { handle, loadState };
