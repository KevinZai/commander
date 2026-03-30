// ============================================================================
// Kevin Z's Claude Code Kit — Gamification Stats Tracker
// ============================================================================
// Tracks session stats, streaks, and achievements. Stores state in
// ~/.claude/kit-stats.json. All functions use immutable patterns.
//
// Usage:
//   const { recordSession, getStats, getStreak, getAchievements, checkUnlocks } = require('./kit-stats');
//   const unlocked = recordSession({ toolCalls: 42, cost: 0.35 });
//   console.log(getStreak());         // { current: 3, longest: 5, isActive: true }
//   console.log(getAchievements());   // [{ id, name, emoji, ... }]
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_PATH = path.join(os.homedir(), '.claude', 'kit-stats.json');

const DEFAULT_STATS = {
  version: 1,
  totalSessions: 0,
  totalToolCalls: 0,
  totalCost: 0,
  streak: { current: 0, longest: 0, lastActiveDate: null },
  achievements: [],
  dailyLog: {},
  celebrationCount: 0,
};

const ACHIEVEMENT_DEFS = [
  { id: 'first_commit', name: 'First Blood', emoji: '\u{1FA78}', description: 'Made your first commit with the Kit' },
  { id: 'first_verify', name: 'Trust but Verify', emoji: '\u{1F50D}', description: 'Ran /verify for the first time' },
  { id: 'tools_10', name: 'Tool Time', emoji: '\u{1F527}', description: 'Used 10 tools in one session' },
  { id: 'tools_50', name: 'Power User', emoji: '\u26A1', description: 'Used 50 tools in one session' },
  { id: 'tools_100', name: 'Terminal Warrior', emoji: '\u2694\uFE0F', description: 'Used 100 tools in one session' },
  { id: 'mega_skill', name: 'Mega Mind', emoji: '\u{1F9E0}', description: 'Used a mega-skill for the first time' },
  { id: 'night_mode', name: 'Night Owl', emoji: '\u{1F989}', description: 'Completed a night mode session' },
  { id: 'streak_3', name: 'On a Roll', emoji: '\u{1F3B3}', description: '3-day coding streak' },
  { id: 'streak_7', name: 'Week Warrior', emoji: '\u{1F4AA}', description: '7-day coding streak' },
  { id: 'streak_30', name: 'Legendary', emoji: '\u{1F451}', description: '30-day coding streak' },
  { id: 'celebrate_10', name: 'Party Animal', emoji: '\u{1F38A}', description: 'Celebrated 10 times' },
  { id: 'session_cost_under_50c', name: 'Frugal Coder', emoji: '\u{1F4B0}', description: 'Completed a productive session under $0.50' },
  // Kit Commander achievements
  { id: 'commander_first', name: 'Commander', emoji: '\u{1F3AE}', description: 'Launched Kit Commander for the first time' },
  { id: 'commander_5_sessions', name: 'Assisted Mode', emoji: '\u{1F680}', description: 'Completed 5 sessions via Kit Commander' },
  { id: 'commander_20_sessions', name: 'Power Commander', emoji: '\u{1F31F}', description: 'Completed 20 sessions — unlocked power user mode' },
  { id: 'commander_first_build', name: 'First Build', emoji: '\u{1F3D7}\uFE0F', description: 'Built your first project through Kit Commander' },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readStats() {
  try {
    const raw = fs.readFileSync(STATS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.version === 1) {
      return { ...DEFAULT_STATS, ...parsed, streak: { ...DEFAULT_STATS.streak, ...parsed.streak } };
    }
    return { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function writeStats(stats) {
  const dir = path.dirname(STATS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00Z');
  const b = new Date(dateStrB + 'T00:00:00Z');
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function updateStreak(streak, today) {
  if (!streak.lastActiveDate) {
    return { current: 1, longest: Math.max(streak.longest, 1), lastActiveDate: today };
  }

  if (streak.lastActiveDate === today) {
    return { ...streak };
  }

  const gap = daysBetween(streak.lastActiveDate, today);

  if (gap === 1) {
    const newCurrent = streak.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(streak.longest, newCurrent),
      lastActiveDate: today,
    };
  }

  // Streak broken
  return { current: 1, longest: Math.max(streak.longest, 1), lastActiveDate: today };
}

function hasAchievement(achievements, id) {
  return achievements.some(a => a.id === id);
}

function unlockAchievement(id) {
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
  if (!def) return null;
  return { ...def, unlockedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a session's stats. Updates daily log, streak, totals, and checks
 * for new achievement unlocks.
 *
 * @param {object} stats - Session statistics
 * @param {number} [stats.toolCalls=0]
 * @param {number} [stats.filesModified=0]
 * @param {number} [stats.linesAdded=0]
 * @param {number} [stats.linesRemoved=0]
 * @param {number} [stats.cost=0]
 * @param {number} [stats.durationMs=0]
 * @returns {Array} Newly unlocked achievements
 */
function recordSession(stats = {}) {
  const current = readStats();
  const today = todayKey();

  const sessionData = {
    toolCalls: stats.toolCalls || 0,
    filesModified: stats.filesModified || 0,
    linesAdded: stats.linesAdded || 0,
    linesRemoved: stats.linesRemoved || 0,
    cost: stats.cost || 0,
    durationMs: stats.durationMs || 0,
  };

  // Build updated daily log entry (immutable)
  const existingDay = current.dailyLog[today] || { sessions: 0, toolCalls: 0, cost: 0 };
  const updatedDay = {
    sessions: existingDay.sessions + 1,
    toolCalls: existingDay.toolCalls + sessionData.toolCalls,
    cost: existingDay.cost + sessionData.cost,
  };

  const updatedStreak = updateStreak(current.streak, today);

  const updated = {
    ...current,
    totalSessions: current.totalSessions + 1,
    totalToolCalls: current.totalToolCalls + sessionData.toolCalls,
    totalCost: current.totalCost + sessionData.cost,
    streak: updatedStreak,
    dailyLog: { ...current.dailyLog, [today]: updatedDay },
    achievements: [...current.achievements],
    celebrationCount: current.celebrationCount,
  };

  // Check for new unlocks
  const newUnlocks = checkUnlocksInternal(updated, sessionData);

  if (newUnlocks.length > 0) {
    updated.achievements = [...updated.achievements, ...newUnlocks];
    updated.celebrationCount = updated.celebrationCount + newUnlocks.length;
  }

  writeStats(updated);
  return newUnlocks;
}

/**
 * Check which achievements would be unlocked given current state + session.
 * Does NOT modify state.
 *
 * @param {object} stats - Current cumulative stats object
 * @param {object} sessionStats - Current session stats
 * @returns {Array} Newly unlocked achievement objects
 */
function checkUnlocksInternal(stats, sessionStats) {
  const earned = stats.achievements;
  const unlocked = [];

  function tryUnlock(id) {
    if (!hasAchievement(earned, id) && !unlocked.some(u => u.id === id)) {
      const ach = unlockAchievement(id);
      if (ach) unlocked.push(ach);
    }
  }

  // Tool call milestones (session-level)
  if (sessionStats.toolCalls >= 10) tryUnlock('tools_10');
  if (sessionStats.toolCalls >= 50) tryUnlock('tools_50');
  if (sessionStats.toolCalls >= 100) tryUnlock('tools_100');

  // Cost achievement (session-level, must be productive: 5+ tool calls)
  if (sessionStats.cost > 0 && sessionStats.cost < 0.50 && sessionStats.toolCalls >= 5) {
    tryUnlock('session_cost_under_50c');
  }

  // Streak milestones
  if (stats.streak.current >= 3) tryUnlock('streak_3');
  if (stats.streak.current >= 7) tryUnlock('streak_7');
  if (stats.streak.current >= 30) tryUnlock('streak_30');

  // Celebration count (includes unlocks from this batch)
  if (stats.celebrationCount + unlocked.length >= 10) tryUnlock('celebrate_10');

  return unlocked;
}

/**
 * Check for unlocks based on an event trigger (for hooks to call).
 * These are event-based achievements not tied to session recording.
 *
 * @param {object} event - Event object with { type: string }
 * @returns {Array} Newly unlocked achievement objects
 */
function checkUnlocks(event = {}) {
  const current = readStats();
  const unlocked = [];

  function tryUnlock(id) {
    if (!hasAchievement(current.achievements, id) && !unlocked.some(u => u.id === id)) {
      const ach = unlockAchievement(id);
      if (ach) unlocked.push(ach);
    }
  }

  if (event.type === 'commit') tryUnlock('first_commit');
  if (event.type === 'verify') tryUnlock('first_verify');
  if (event.type === 'mega_skill') tryUnlock('mega_skill');
  if (event.type === 'night_mode') tryUnlock('night_mode');

  if (unlocked.length > 0) {
    const updated = {
      ...current,
      achievements: [...current.achievements, ...unlocked],
      celebrationCount: current.celebrationCount + unlocked.length,
    };
    writeStats(updated);
  }

  return unlocked;
}

/**
 * Get the full stats object (read-only copy).
 *
 * @returns {object} Current stats
 */
function getStats() {
  return readStats();
}

/**
 * Get current streak information.
 *
 * @returns {{ current: number, longest: number, isActive: boolean }}
 */
function getStreak() {
  const stats = readStats();
  const today = todayKey();
  const { current, longest, lastActiveDate } = stats.streak;

  let isActive = false;
  if (lastActiveDate) {
    const gap = daysBetween(lastActiveDate, today);
    isActive = gap <= 1;
  }

  return { current, longest, isActive };
}

/**
 * Get all unlocked achievements.
 *
 * @returns {Array<{ id: string, name: string, emoji: string, description: string, unlockedAt: string }>}
 */
function getAchievements() {
  const stats = readStats();
  return stats.achievements.map(a => ({ ...a }));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  recordSession,
  getStats,
  getStreak,
  getAchievements,
  checkUnlocks,
  STATS_PATH,
  ACHIEVEMENT_DEFS,
};
