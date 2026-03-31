'use strict';

// Hook: linear-pr-link
// Type: PostToolUse
// Purpose: Notes git push events for Linear PR linking

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.env.HOME, '.claude', 'commander', 'linear-tracking', 'pr-links.json');

function ensureDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) return { pushes: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { pushes: [] };
  }
}

function saveState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function handle(event) {
  const { tool, toolInput } = event;

  if (tool !== 'Bash') return;

  const command = toolInput?.command || '';
  if (!command.includes('git push')) return;

  const branchMatch = command.match(/git push\s+\S+\s+(\S+)/) || [];
  const branch = branchMatch[1] || 'unknown';

  const ccMatch = branch.match(/cc-(\d+)/i);
  const linearId = ccMatch ? `CC-${ccMatch[1]}` : null;

  const state = loadState();
  state.pushes.push({
    timestamp: new Date().toISOString(),
    branch,
    linearId,
    command: command.slice(0, 200),
    cwd: process.cwd(),
    needsLinking: !!linearId,
  });

  if (state.pushes.length > 100) {
    state.pushes = state.pushes.slice(-50);
  }

  saveState(state);

  if (linearId) {
    process.stderr.write(`[linear-pr-link] Push to ${branch} detected — link PR to ${linearId} in Linear\n`);
  }
}

module.exports = { handle, loadState };
