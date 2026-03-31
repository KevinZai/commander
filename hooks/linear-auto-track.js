'use strict';

// Hook: linear-auto-track
// Type: PostToolUse
// Purpose: Logs phase file modifications for Linear tracking

const fs = require('fs');
const path = require('path');

const PHASE_FILES = [
  'tasks/spec-',
  'tasks/plan-',
  'tasks/todo.md',
  'tasks/lessons.md',
  'CLAUDE.md',
];

const LOG_DIR = path.join(process.env.HOME, '.claude', 'commander', 'linear-tracking');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `${date}.jsonl`);
}

function isPhaseFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return PHASE_FILES.some((p) => normalized.includes(p));
}

function handle(event) {
  const { tool, toolInput, result } = event;

  if (tool !== 'Write' && tool !== 'Edit') return;

  const filePath = toolInput?.file_path || toolInput?.path || '';
  if (!isPhaseFile(filePath)) return;

  ensureLogDir();

  const entry = {
    timestamp: new Date().toISOString(),
    tool,
    file: filePath,
    phase: detectPhase(filePath),
    cwd: process.cwd(),
  };

  fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
}

function detectPhase(filePath) {
  if (filePath.includes('spec-')) return 'spec';
  if (filePath.includes('plan-')) return 'plan';
  if (filePath.includes('todo.md')) return 'execution';
  if (filePath.includes('lessons.md')) return 'retrospective';
  if (filePath.includes('CLAUDE.md')) return 'setup';
  return 'unknown';
}

module.exports = { handle, isPhaseFile, detectPhase };
