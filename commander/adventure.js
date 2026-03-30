'use strict';

const fs = require('fs');
const path = require('path');

const ADVENTURES_DIR = path.join(__dirname, 'adventures');

/**
 * Load an adventure JSON file by ID.
 * @param {string} id - Adventure filename without extension
 * @returns {object|null} Parsed adventure object
 */
function loadAdventure(id) {
  const filePath = path.join(ADVENTURES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Resolve template variables in a string.
 * Supports {varName} syntax. Resolves from context object.
 * @param {string} template - String with {variable} placeholders
 * @param {object} context - Variable values
 * @returns {string} Resolved string
 */
function resolveTemplate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] !== undefined ? String(context[key]) : match;
  });
}

/**
 * Evaluate a condition against the current state.
 * @param {string} condition - Condition name
 * @param {object} state - Current state
 * @returns {boolean}
 */
function evaluateCondition(condition, state) {
  switch (condition) {
    case 'hasActiveSession':
      return Boolean(state.activeSession);
    case 'isFirstRun':
      return Boolean(state.firstRun);
    case 'isGuided':
      return state.user?.level === 'guided';
    case 'isAssisted':
      return state.user?.level === 'assisted';
    case 'isPower':
      return state.user?.level === 'power';
    default:
      return true; // Unknown conditions pass by default
  }
}

/**
 * Filter choices based on conditions and state.
 * @param {Array} choices - Array of choice objects
 * @param {object} state - Current state
 * @returns {Array} Filtered choices
 */
function filterChoices(choices, state) {
  return choices.filter(choice => {
    if (!choice.condition) return true;
    return evaluateCondition(choice.condition, state);
  });
}

/**
 * Build the context object for template resolution.
 * @param {object} state - Current state
 * @param {object} stats - Kit stats (from kit-stats.js)
 * @returns {object} Context variables
 */
function buildContext(state, stats = {}) {
  return {
    name: state.user?.name || 'there',
    streak: stats.streak?.current || 0,
    sessions: state.user?.sessionsCompleted || 0,
    level: state.user?.level || 'guided',
    lastProject: state.activeSession?.project || 'your project',
    lastTask: state.activeSession?.task || 'your last task',
    welcomeMessage: state.user?.name
      ? `Welcome back, ${state.user.name}!`
      : 'Welcome to Kit Commander!',
  };
}

/**
 * Prepare an adventure screen for rendering.
 * Resolves all templates and filters choices.
 * @param {object} adventure - Raw adventure object
 * @param {object} state - Current state
 * @param {object} stats - Kit stats
 * @returns {object} Prepared adventure ready for rendering
 */
function prepareAdventure(adventure, state, stats = {}) {
  const context = buildContext(state, stats);
  const filteredChoices = filterChoices(adventure.choices || [], state);

  return {
    id: adventure.id,
    title: resolveTemplate(adventure.screen?.title || '', context),
    subtitle: resolveTemplate(
      adventure.screen?.subtitle === 'welcomeMessage'
        ? context.welcomeMessage
        : adventure.screen?.subtitle || '',
      context
    ),
    art: adventure.screen?.art || null,
    prompt: resolveTemplate(adventure.prompt || 'Choose an option:', context),
    choices: filteredChoices.map(c => ({
      ...c,
      label: resolveTemplate(c.label, context),
      description: resolveTemplate(c.description || '', context),
    })),
    action: adventure.action || null,
    afterAction: adventure.afterAction || null,
    subAdventures: adventure.subAdventures || null,
  };
}

/**
 * Find a choice by key input.
 * @param {Array} choices - Available choices
 * @param {string} input - User's key press
 * @returns {object|null} Matching choice
 */
function matchChoice(choices, input) {
  const normalized = input.trim().toLowerCase();
  return choices.find(c => c.key.toLowerCase() === normalized) || null;
}

module.exports = {
  loadAdventure,
  resolveTemplate,
  evaluateCondition,
  filterChoices,
  buildContext,
  prepareAdventure,
  matchChoice,
  ADVENTURES_DIR,
};
