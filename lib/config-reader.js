#!/usr/bin/env node
// ============================================================================
// The Claude Code Bible — Config Reader
// ============================================================================
// Reads ~/.claude/bible-config.json and merges environment variable overrides.
// Provides typed accessors for assistance level, cost ceiling, feature flags.
//
// Usage:
//   const { readConfig, getAssistLevel, getCostCeiling, isFeatureEnabled } = require('./config-reader');
//   const config = readConfig();
//   const level = getAssistLevel();       // 'standard'
//   const ceiling = getCostCeiling();     // 5.00
//   const on = isFeatureEnabled('coach'); // true
//
// Environment variable overrides (take precedence over config file):
//   KZ_ASSIST_LEVEL      off | minimal | standard | guided | mentored
//   KZ_COACH_DISABLE     1 to disable coaching
//   KZ_COACH_INTERVAL    Number of responses between coaching nudges
//   KZ_COST_CEILING      Max cost per workflow in dollars
//   KZ_NO_COLOR          1 to disable ANSI colors
//   KZ_NO_ANIMATION      1 to disable terminal animations
//   KZ_AUTO_CHECKPOINT    1 to enable auto-checkpoint on edits
//   KZ_CONFIDENCE_GATE   1 to require confidence check before execution
//   KZ_SESSION_COACH     1 to enable, 0 to disable session coaching
//   KZ_STATUS_LINE       1 to enable, 0 to disable status line
//   KZ_SELF_VERIFY       1 to enable, 0 to disable self-verify hook
//   KZ_CONTEXT_GUARD     1 to enable, 0 to disable context guard
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_PATH = path.join(os.homedir(), '.claude', 'bible-config.json');

const VALID_ASSIST_LEVELS = ['off', 'minimal', 'standard', 'guided', 'mentored'];

const DEFAULT_CONFIG = {
  version: '1.1',
  assistLevel: 'standard',
  costCeiling: 5.0,
  coachInterval: 5,
  features: {
    coach: true,
    autoCheckpoint: true,
    confidenceGate: true,
    sessionCoach: true,
    statusLine: true,
    selfVerify: true,
    contextGuard: true,
    colorOutput: true,
    animations: true,
  },
  thresholds: {
    costWarning: 0.5,
    costKill: 2.0,
    contextWarningPct: 80,
    stuckTimeoutSec: 60,
  },
  agentDefaults: {
    maxRetries: 2,
    circuitBreakerThreshold: 2,
    timeoutMs: 300000,
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _cachedConfig = null;

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function readConfigFile() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function applyEnvOverrides(config) {
  const merged = { ...config, features: { ...config.features }, thresholds: { ...config.thresholds }, agentDefaults: { ...config.agentDefaults } };

  // Assist level
  const envLevel = process.env.KZ_ASSIST_LEVEL;
  if (envLevel && VALID_ASSIST_LEVELS.includes(envLevel.toLowerCase())) {
    merged.assistLevel = envLevel.toLowerCase();
  }

  // Coach interval
  const envInterval = process.env.KZ_COACH_INTERVAL;
  if (envInterval) {
    const parsed = parseInt(envInterval, 10);
    if (!isNaN(parsed) && parsed > 0) {
      merged.coachInterval = parsed;
    }
  }

  // Cost ceiling
  const envCeiling = process.env.KZ_COST_CEILING;
  if (envCeiling) {
    const parsed = parseFloat(envCeiling);
    if (!isNaN(parsed) && parsed > 0) {
      merged.costCeiling = parsed;
    }
  }

  // Feature toggles from env vars
  const featureEnvMap = {
    KZ_COACH_DISABLE: { key: 'coach', invert: true },
    KZ_SESSION_COACH: { key: 'sessionCoach', invert: false },
    KZ_AUTO_CHECKPOINT: { key: 'autoCheckpoint', invert: false },
    KZ_CONFIDENCE_GATE: { key: 'confidenceGate', invert: false },
    KZ_STATUS_LINE: { key: 'statusLine', invert: false },
    KZ_SELF_VERIFY: { key: 'selfVerify', invert: false },
    KZ_CONTEXT_GUARD: { key: 'contextGuard', invert: false },
    KZ_NO_COLOR: { key: 'colorOutput', invert: true },
    KZ_NO_ANIMATION: { key: 'animations', invert: true },
  };

  for (const [envVar, { key, invert }] of Object.entries(featureEnvMap)) {
    const val = process.env[envVar];
    if (val !== undefined) {
      const truthy = val === '1' || val.toLowerCase() === 'true';
      merged.features[key] = invert ? !truthy : truthy;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read the full Bible config, merging defaults + file + env overrides.
 * Results are cached after first read. Pass `force: true` to re-read.
 *
 * @param {{ force?: boolean }} options
 * @returns {object} The merged config object
 */
function readConfig(options = {}) {
  if (_cachedConfig && !options.force) {
    return _cachedConfig;
  }

  const fileConfig = readConfigFile();
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
  const withEnv = applyEnvOverrides(merged);

  _cachedConfig = Object.freeze(withEnv);
  return _cachedConfig;
}

/**
 * Get the current assistance level.
 * Levels control how proactive Claude is with suggestions.
 *
 * @returns {'off' | 'minimal' | 'standard' | 'guided' | 'mentored'}
 */
function getAssistLevel() {
  const config = readConfig();
  return config.assistLevel;
}

/**
 * Get the maximum cost ceiling per workflow in dollars.
 *
 * @returns {number} Dollar amount (e.g. 5.00)
 */
function getCostCeiling() {
  const config = readConfig();
  return config.costCeiling;
}

/**
 * Check whether a feature flag is enabled.
 * Features can be toggled in bible-config.json or via env vars.
 *
 * Known features:
 *   coach, autoCheckpoint, confidenceGate, sessionCoach,
 *   statusLine, selfVerify, contextGuard, colorOutput, animations
 *
 * @param {string} name - Feature name (camelCase)
 * @returns {boolean} True if enabled, false if disabled or unknown
 */
function isFeatureEnabled(name) {
  const config = readConfig();
  if (config.features && typeof config.features[name] === 'boolean') {
    return config.features[name];
  }
  return false;
}

/**
 * Get threshold values for alerts and guards.
 *
 * @param {string} name - Threshold name (costWarning, costKill, contextWarningPct, stuckTimeoutSec)
 * @returns {number | undefined}
 */
function getThreshold(name) {
  const config = readConfig();
  return config.thresholds?.[name];
}

/**
 * Get agent defaults for orchestration.
 *
 * @returns {{ maxRetries: number, circuitBreakerThreshold: number, timeoutMs: number }}
 */
function getAgentDefaults() {
  const config = readConfig();
  return { ...config.agentDefaults };
}

/**
 * Get the coach nudge interval (number of responses between tips).
 *
 * @returns {number}
 */
function getCoachInterval() {
  const config = readConfig();
  return config.coachInterval;
}

/**
 * Reset the cached config (useful for testing or after config file changes).
 */
function resetCache() {
  _cachedConfig = null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  readConfig,
  getAssistLevel,
  getCostCeiling,
  isFeatureEnabled,
  getThreshold,
  getAgentDefaults,
  getCoachInterval,
  resetCache,
  CONFIG_PATH,
  DEFAULT_CONFIG,
  VALID_ASSIST_LEVELS,
};
