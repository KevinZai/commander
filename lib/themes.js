#!/usr/bin/env node
// ============================================================================
// CC Commander — Theme System (Node.js)
// ============================================================================
// Provides theme color definitions for hooks and Node scripts.
// Reads CC_THEME env var or bible-config.json to select active theme.
//
// Usage:
//   const { getTheme, THEMES } = require('./themes');
//   const t = getTheme();
//   process.stderr.write(`${t.primary}Hello${t.reset}\n`);
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Theme Definitions
// ---------------------------------------------------------------------------

const THEMES = {
  claude: {
    name: 'Claude Anthropic',
    primary: '\x1b[38;5;172m',
    secondary: '\x1b[38;5;145m',
    dim: '\x1b[38;5;240m',
    accent: '\x1b[38;5;99m',
    success: '\x1b[38;5;42m',
    warn: '\x1b[38;5;214m',
    error: '\x1b[38;5;196m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    css: { bg: '#0F0F1A', primary: '#D97706', accent: '#6366F1', emerald: '#10B981' },
  },
  oled: {
    name: 'OLED Black',
    primary: '\x1b[38;5;15m',
    secondary: '\x1b[38;5;245m',
    dim: '\x1b[38;5;238m',
    accent: '\x1b[38;5;33m',
    success: '\x1b[38;5;42m',
    warn: '\x1b[38;5;214m',
    error: '\x1b[38;5;196m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    css: { bg: '#000000', primary: '#FFFFFF', accent: '#3B82F6', emerald: '#22C55E' },
  },
  matrix: {
    name: 'Matrix',
    primary: '\x1b[38;5;46m',
    secondary: '\x1b[38;5;34m',
    dim: '\x1b[38;5;22m',
    accent: '\x1b[38;5;51m',
    success: '\x1b[38;5;46m',
    warn: '\x1b[38;5;214m',
    error: '\x1b[38;5;196m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    css: { bg: '#0A0A0A', primary: '#00FF41', accent: '#00FFFF', emerald: '#00FF00' },
  },
};

const RANDOM_PALETTES = [
  { name: 'cyberpunk', primary: '\x1b[38;5;206m', accent: '\x1b[38;5;45m' },
  { name: 'sunset', primary: '\x1b[38;5;208m', accent: '\x1b[38;5;93m' },
  { name: 'arctic', primary: '\x1b[38;5;110m', accent: '\x1b[38;5;67m' },
  { name: 'coral', primary: '\x1b[38;5;209m', accent: '\x1b[38;5;30m' },
  { name: 'neon', primary: '\x1b[38;5;154m', accent: '\x1b[38;5;199m' },
];

// ---------------------------------------------------------------------------
// Theme Resolution
// ---------------------------------------------------------------------------

let _cachedTheme = null;

/**
 * Get the active theme. Checks CC_THEME env var, then bible-config.json.
 * Defaults to 'claude'. Results are cached.
 *
 * @param {{ force?: boolean }} options
 * @returns {object} Theme color object
 */
function getTheme(options = {}) {
  if (_cachedTheme && !options.force) return _cachedTheme;

  let themeName = process.env.CC_THEME || process.env.KZ_THEME || null;

  if (!themeName) {
    try {
      const configPath = path.join(os.homedir(), '.claude', 'bible-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      themeName = config.theme || 'claude';
    } catch {
      themeName = 'claude';
    }
  }

  themeName = themeName.toLowerCase();

  if (themeName === 'random') {
    const palette = RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)];
    _cachedTheme = {
      ...THEMES.claude,
      name: `Random: ${palette.name}`,
      primary: palette.primary,
      accent: palette.accent,
    };
    return _cachedTheme;
  }

  _cachedTheme = THEMES[themeName] || THEMES.claude;
  return _cachedTheme;
}

/**
 * Check if colors are disabled.
 */
function isColorDisabled() {
  return (
    process.env.CC_NO_COLOR === '1' ||
    process.env.KZ_NO_COLOR === '1' ||
    process.env.NO_COLOR === '1'
  );
}

/**
 * Get a theme with colors stripped if NO_COLOR is set.
 */
function getSafeTheme() {
  if (isColorDisabled()) {
    return {
      name: 'no-color',
      primary: '', secondary: '', dim: '', accent: '',
      success: '', warn: '', error: '', bold: '', reset: '',
    };
  }
  return getTheme();
}

/**
 * Reset cached theme (for testing).
 */
function resetThemeCache() {
  _cachedTheme = null;
}

module.exports = {
  THEMES,
  RANDOM_PALETTES,
  getTheme,
  getSafeTheme,
  isColorDisabled,
  resetThemeCache,
};
