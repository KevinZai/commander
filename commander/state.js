'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const COMMANDER_DIR = path.join(os.homedir(), '.claude', 'commander');
const STATE_PATH = path.join(COMMANDER_DIR, 'state.json');
const SESSIONS_DIR = path.join(COMMANDER_DIR, 'sessions');
const HISTORY_PATH = path.join(COMMANDER_DIR, 'history.json');

function ensureDirs() {
  for (const dir of [COMMANDER_DIR, SESSIONS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// --- State (current adventure path, user preferences, active sessions) ---

function defaultState() {
  return {
    version: 1,
    user: { name: null, level: 'guided', sessionsCompleted: 0 },
    activeSession: null,
    profiles: {},
    firstRun: true,
    orchestrator: {
      pinnedTools: {},
      stackPreferences: [],
      toolHistory: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState() {
  ensureDirs();
  if (!fs.existsSync(STATE_PATH)) return defaultState();
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  ensureDirs();
  const updated = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(STATE_PATH, JSON.stringify(updated, null, 2), { mode: 0o600 });
  return updated;
}

function updateState(patch) {
  const current = loadState();
  return saveState({ ...current, ...patch });
}

function updateUser(patch) {
  const state = loadState();
  return saveState({ ...state, user: { ...state.user, ...patch } });
}

// --- Progressive Disclosure ---

function getUserLevel(state) {
  if (!state) state = loadState();
  const sessions = state.user.sessionsCompleted || 0;
  const explicit = state.user.level;
  if (explicit === 'power') return 'power';
  if (sessions >= 20) return 'power';
  if (sessions >= 5) return 'assisted';
  return 'guided';
}

// --- Sessions ---

function generateSessionId() {
  return `kc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function createSession(metadata) {
  ensureDirs();
  const id = generateSessionId();
  const session = {
    id,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null,
    cost: 0,
    filesChanged: [],
    skillsUsed: [],
    task: metadata.task || '',
    project: metadata.project || null,
    profile: metadata.profile || null,
    claudeSessionId: null,
    linearIssueId: null,
    linearIssueIdentifier: null,
    status: 'active',
    outcome: null,
    resumePoint: null,
  };
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${id}.json`),
    JSON.stringify(session, null, 2),
    { mode: 0o600 }
  );

  // Set as active session in state
  updateState({ activeSession: id });
  return session;
}

function getSession(id) {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function updateSession(id, patch) {
  const session = getSession(id);
  if (!session) return null;
  const updated = { ...session, ...patch };
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2),
    { mode: 0o600 }
  );
  return updated;
}

function completeSession(id, outcome) {
  const session = getSession(id);
  if (!session) return null;
  const endTime = new Date().toISOString();
  const duration = Math.round(
    (new Date(endTime) - new Date(session.startTime)) / 1000
  );
  const completed = {
    ...session,
    endTime,
    duration,
    status: 'completed',
    outcome: outcome || 'success',
  };
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${id}.json`),
    JSON.stringify(completed, null, 2),
    { mode: 0o600 }
  );

  // Append to history
  appendHistory(completed);

  // Clear active session, increment counter
  const state = loadState();
  saveState({
    ...state,
    activeSession: null,
    user: {
      ...state.user,
      sessionsCompleted: (state.user.sessionsCompleted || 0) + 1,
    },
  });

  return completed;
}

function listSessions(limit = 10) {
  ensureDirs();
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);
    return files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function getActiveSession() {
  const state = loadState();
  if (!state.activeSession) return null;
  return getSession(state.activeSession);
}

// --- History (append-only log) ---

function appendHistory(session) {
  ensureDirs();
  let history = [];
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    } catch {
      history = [];
    }
  }
  history.push({
    id: session.id,
    task: session.task,
    project: session.project,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    cost: session.cost,
    outcome: session.outcome,
  });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), { mode: 0o600 });
}

// --- Profiles ---

function createProfile(name, config) {
  const state = loadState();
  const profiles = { ...state.profiles, [name]: { ...config, createdAt: new Date().toISOString() } };
  saveState({ ...state, profiles });
  return profiles[name];
}

function getProfile(name) {
  const state = loadState();
  return state.profiles[name] || null;
}

function listProfiles() {
  const state = loadState();
  return Object.entries(state.profiles).map(([name, config]) => ({ name, ...config }));
}

function repairState() {
  ensureDirs();
  var details = [];
  if (fs.existsSync(STATE_PATH)) {
    try { JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
    catch (_e) {
      var backup = STATE_PATH + '.corrupt-' + Date.now();
      fs.copyFileSync(STATE_PATH, backup);
      fs.writeFileSync(STATE_PATH, JSON.stringify(defaultState(), null, 2), { mode: 0o600 });
      details.push('state.json corrupt — backed up, reset');
    }
  }
  if (fs.existsSync(HISTORY_PATH)) {
    try { JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
    catch (_e) {
      var backup2 = HISTORY_PATH + '.corrupt-' + Date.now();
      fs.copyFileSync(HISTORY_PATH, backup2);
      fs.writeFileSync(HISTORY_PATH, '[]', { mode: 0o600 });
      details.push('history.json corrupt — backed up, reset');
    }
  }
  return { repaired: details.length > 0, details: details };
}

module.exports = {
  COMMANDER_DIR: COMMANDER_DIR, STATE_PATH: STATE_PATH, SESSIONS_DIR: SESSIONS_DIR,
  loadState: loadState, saveState: saveState, updateState: updateState, updateUser: updateUser,
  getUserLevel: getUserLevel, createSession: createSession, getSession: getSession,
  updateSession: updateSession, completeSession: completeSession, listSessions: listSessions,
  getActiveSession: getActiveSession, createProfile: createProfile, getProfile: getProfile,
  listProfiles: listProfiles, repairState: repairState,
};
