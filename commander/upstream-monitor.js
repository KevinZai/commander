'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(
  process.env.HOME,
  '.claude',
  'commander',
  'upstream-check.json'
);

function ensureStateDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadLastCheck() {
  ensureStateDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { lastCheck: null, submodules: {} };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveLastCheck(state) {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch {
    return '';
  }
}

function getSubmoduleStatus() {
  const raw = exec('git submodule status');
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^([+ -U])([0-9a-f]+)\s+(\S+)(?:\s+\((.+)\))?/);
    if (!match) return null;
    const [, flag, sha, name, desc] = match;
    return {
      name,
      sha,
      dirty: flag === '+',
      uninitialized: flag === '-',
      mergeConflict: flag === 'U',
      description: desc || null,
    };
  }).filter(Boolean);
}

function checkForUpdates() {
  const submodules = getSubmoduleStatus();
  const results = [];

  for (const sub of submodules) {
    const subPath = sub.name;
    const remoteSha = exec(`git -C ${subPath} ls-remote origin HEAD`).split(/\s/)[0] || '';
    const localSha = sub.sha;
    const hasUpdate = remoteSha && remoteSha !== localSha;

    results.push({
      name: sub.name,
      localSha,
      remoteSha: remoteSha || 'unknown',
      hasUpdate,
      dirty: sub.dirty,
    });
  }

  const state = loadLastCheck();
  state.lastCheck = new Date().toISOString();
  for (const r of results) {
    state.submodules[r.name] = {
      localSha: r.localSha,
      remoteSha: r.remoteSha,
      checkedAt: state.lastCheck,
    };
  }
  saveLastCheck(state);

  return results;
}

function updateSubmodule(name) {
  const before = exec(`git -C ${name} rev-parse HEAD`);
  exec(`git submodule update --remote ${name}`);
  const after = exec(`git -C ${name} rev-parse HEAD`);
  return { name, before, after, updated: before !== after };
}

function updateAll() {
  const submodules = getSubmoduleStatus();
  return submodules.map((sub) => updateSubmodule(sub.name));
}

function generateChangelog(name, oldSha, newSha) {
  if (!oldSha || !newSha || oldSha === newSha) {
    return `No changes for ${name}`;
  }
  const log = exec(`git -C ${name} log --oneline ${oldSha}..${newSha}`);
  if (!log) return `No commits between ${oldSha.slice(0, 7)} and ${newSha.slice(0, 7)}`;

  const lines = log.split('\n').filter(Boolean);
  const header = `## ${name} (${oldSha.slice(0, 7)}..${newSha.slice(0, 7)})`;
  const body = lines.map((l) => `- ${l}`).join('\n');
  return `${header}\n\n${body}`;
}

module.exports = {
  getSubmoduleStatus,
  checkForUpdates,
  updateSubmodule,
  updateAll,
  generateChangelog,
  loadLastCheck,
  saveLastCheck,
};
