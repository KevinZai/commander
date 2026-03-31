'use strict';

// Hook: linear-phase-gate
// Type: Stop
// Purpose: Reminds about Linear issue status updates before session ends

const fs = require('fs');
const path = require('path');

const TRACKING_DIR = path.join(process.env.HOME, '.claude', 'commander', 'linear-tracking');

function handle() {
  const todayLog = getTodayLog();
  if (todayLog.length === 0) return;

  const phases = new Set(todayLog.map((e) => e.phase));
  const files = todayLog.map((e) => path.basename(e.file));

  const message = [
    '',
    '[linear-phase-gate] Session ending with tracked changes:',
    `  Phases touched: ${[...phases].join(', ')}`,
    `  Files modified: ${files.join(', ')}`,
    '',
    '  Reminder: Update Linear issue status if phase changed.',
    '  - spec -> In Progress',
    '  - plan -> In Progress',
    '  - execution -> In Review (when done)',
    '  - retrospective -> Done',
    '',
  ].join('\n');

  process.stderr.write(message);
}

function getTodayLog() {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(TRACKING_DIR, `${date}.jsonl`);

  if (!fs.existsSync(logFile)) return [];

  try {
    return fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

module.exports = { handle, getTodayLog };
