'use strict';

var path = require('path');

// Lazy-loaded deps
var vendorScanner = null;
function getVendorScanner() { if (!vendorScanner) vendorScanner = require('./vendor-scanner'); return vendorScanner; }

var state = null;
function getState() { if (!state) state = require('./state'); return state; }

/**
 * Known package metadata for scoring
 */
var PACKAGE_META = {
  'oh-my-claudecode': { stars: 17000, updated: '2026-03-31' },
  'claude-code-best-practice': { stars: 26000, updated: '2026-03-30' },
  'everything-claude-code': { stars: 120000, updated: '2026-03-30' },
  'superpowers': { stars: 29000, updated: '2026-03-28' },
  'claude-hud': { stars: 15000, updated: '2026-03-28' },
  'caliber-ai-setup': { stars: 302, updated: '2026-03-30' },
  'gstack': { stars: 58000, updated: '2026-03-30' },
  'compound-engineering': { stars: 11500, updated: '2026-03-30' },
  'claude-reflect': { stars: 860, updated: '2026-03-30' },
  'rtk': { stars: 14600, updated: '2026-03-30' },
  'acpx': { stars: 1800, updated: '2026-03-31' },
};

/**
 * Score a tool candidate for a given phase.
 * Returns 0-100 based on:
 *   capabilityMatch (50%): keyword overlap between task description and skill name/description
 *   normalizedStars (15%): min(100, stars / 1200) -- popularity signal
 *   updateRecency  (15%): days since update, mapped 0-100 (0 days=100, 30+=0)
 *   userPreference (20%): pinned preference = 100, history boost = 50, default = 30
 */
function scoreTool(capability, context, preferences) {
  if (!capability || !capability.vendor || !capability.skill) return 0;

  // --- capabilityMatch (50%) ---
  var matchScore = 0;
  var taskWords = [];
  if (context && context.taskDescription) {
    taskWords = context.taskDescription.toLowerCase().split(/\s+/);
  }
  var skillLower = capability.skill.toLowerCase();
  var descLower = (capability.description || '').toLowerCase();
  var combined = skillLower + ' ' + descLower;

  if (taskWords.length > 0) {
    var hits = 0;
    taskWords.forEach(function(word) {
      if (word.length < 3) return; // skip tiny words
      if (combined.indexOf(word) !== -1) hits++;
    });
    matchScore = Math.min(100, (hits / Math.max(taskWords.length, 1)) * 150);
  } else {
    // No task description: give base score for being in the right phase
    matchScore = 40;
  }

  // --- normalizedStars (15%) ---
  var meta = PACKAGE_META[capability.vendor];
  var starScore = 0;
  if (meta && meta.stars) {
    starScore = Math.min(100, meta.stars / 1200);
  }

  // --- updateRecency (15%) ---
  var recencyScore = 50; // default if no data
  if (meta && meta.updated) {
    var now = new Date();
    var updated = new Date(meta.updated);
    var daysSince = Math.max(0, Math.floor((now - updated) / (1000 * 60 * 60 * 24)));
    recencyScore = Math.max(0, 100 - (daysSince * (100 / 30)));
  }

  // --- userPreference (20%) ---
  var prefScore = 30; // default
  if (preferences) {
    var phase = context && context.phase ? context.phase : '';
    var pinned = preferences.pinnedTools || {};
    if (pinned[phase] === capability.vendor || pinned[phase] === capability.skill) {
      prefScore = 100;
    } else if (preferences.toolHistory) {
      var used = preferences.toolHistory.some(function(h) {
        return h.vendor === capability.vendor && h.skill === capability.skill;
      });
      if (used) prefScore = 50;
    }
  }

  // Weighted total
  var total = (matchScore * 0.50) + (starScore * 0.15) + (recencyScore * 0.15) + (prefScore * 0.20);
  return Math.round(Math.min(100, Math.max(0, total)));
}

/**
 * Rank all available tools for a phase. Returns sorted array [{vendor, skill, score, breakdown}]
 */
function rankToolsForPhase(phase, context) {
  var vs = getVendorScanner();
  var index = vs.getCachedIndex();
  if (!index || !index[phase]) return [];

  var preferences = loadUserPreferences();
  var ctx = Object.assign({}, context || {}, { phase: phase });

  var ranked = index[phase].map(function(cap) {
    var meta = PACKAGE_META[cap.vendor];
    var starScore = meta ? Math.min(100, meta.stars / 1200) : 0;
    var recencyScore = 50;
    if (meta && meta.updated) {
      var now = new Date();
      var updated = new Date(meta.updated);
      var daysSince = Math.max(0, Math.floor((now - updated) / (1000 * 60 * 60 * 24)));
      recencyScore = Math.max(0, 100 - (daysSince * (100 / 30)));
    }

    var score = scoreTool(cap, ctx, preferences);
    return {
      vendor: cap.vendor,
      skill: cap.skill,
      description: cap.description,
      score: score,
      breakdown: {
        stars: Math.round(starScore),
        recency: Math.round(recencyScore),
      },
    };
  });

  ranked.sort(function(a, b) { return b.score - a.score; });
  return ranked;
}

/**
 * Pick the single best tool for a phase
 */
function pickBest(phase, context) {
  var ranked = rankToolsForPhase(phase, context);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Pick best with fallback chain (top 3)
 */
function pickWithFallback(phase, context) {
  var ranked = rankToolsForPhase(phase, context);
  return ranked.slice(0, 3);
}

/**
 * Load user preferences from state
 */
function loadUserPreferences() {
  try {
    var s = getState();
    var currentState = s.loadState();
    if (currentState && currentState.orchestrator) {
      return currentState.orchestrator;
    }
  } catch (_e) {}
  return { pinnedTools: {}, stackPreferences: [], toolHistory: [] };
}

/**
 * Save user preferences to state
 */
function saveUserPreferences(prefs) {
  try {
    var s = getState();
    s.updateState({ orchestrator: prefs });
  } catch (_e) {}
}

module.exports = {
  scoreTool: scoreTool,
  rankToolsForPhase: rankToolsForPhase,
  pickBest: pickBest,
  pickWithFallback: pickWithFallback,
  loadUserPreferences: loadUserPreferences,
  saveUserPreferences: saveUserPreferences,
  PACKAGE_META: PACKAGE_META,
};
