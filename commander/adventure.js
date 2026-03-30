'use strict';

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ADVENTURES_DIR = path.join(__dirname, 'adventures');

function loadAdventure(id) {
  var filePath = path.join(ADVENTURES_DIR, id + '.json');
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_e) { return null; }
}

function resolveTemplate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, function(match, key) {
    return context[key] !== undefined ? String(context[key]) : match;
  });
}

function evaluateCondition(condition, state) {
  switch (condition) {
    case 'hasActiveSession': return Boolean(state.activeSession);
    case 'isFirstRun': return Boolean(state.firstRun);
    case 'isGuided': return state.user && state.user.level === 'guided';
    case 'isAssisted': return state.user && state.user.level === 'assisted';
    case 'isPower': return state.user && state.user.level === 'power';
    case 'hasLinear': return Boolean(process.env.LINEAR_API_KEY_PERSONAL || process.env.LINEAR_API_KEY);
    default: return true;
  }
}

function filterChoices(choices, state) {
  return choices.filter(function(choice) {
    if (!choice.condition) return true;
    return evaluateCondition(choice.condition, state);
  });
}

function resolveGitData() {
  var defaults = { gitBranch: '', gitStatus: '', gitLastCommit: '' };
  var opts = { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 3000 };
  try {
    var branch = childProcess.execSync('git rev-parse --abbrev-ref HEAD', opts).trim();
    var porcelain = childProcess.execSync('git status --porcelain', opts).trim();
    var fileCount = porcelain ? porcelain.split('\n').length : 0;
    var status = fileCount > 0 ? fileCount + ' file' + (fileCount > 1 ? 's' : '') + ' modified' : 'clean';
    var lastCommit = '';
    try { lastCommit = childProcess.execSync('git log -1 --format=%s', opts).trim(); } catch (_e) {}
    return { gitBranch: branch, gitStatus: status, gitLastCommit: lastCommit };
  } catch (_e) { return defaults; }
}

function buildContext(state, stats) {
  if (!stats) stats = {};
  var git = resolveGitData();
  var achievements = stats.achievements || [];
  var streak = stats.streak || {};
  var user = state.user || {};
  return {
    name: user.name || 'there',
    streak: streak.current || 0,
    longestStreak: streak.longest || 0,
    sessions: user.sessionsCompleted || 0,
    level: user.level || 'guided',
    lastProject: (state.activeSession && state.activeSession.project) || 'your project',
    lastTask: (state.activeSession && state.activeSession.task) || 'your last task',
    welcomeMessage: user.name ? 'Welcome back, ' + user.name + '!' : 'Welcome to CC Commander!',
    gitBranch: git.gitBranch,
    gitStatus: git.gitStatus,
    gitLastCommit: git.gitLastCommit,
    totalCost: stats.totalCost ? '$' + stats.totalCost.toFixed(2) : '$0.00',
    achievementCount: achievements.length,
    sessionCount: stats.totalSessions || user.sessionsCompleted || 0,
  };
}

function prepareAdventure(adventure, state, stats) {
  if (!stats) stats = {};
  var context = buildContext(state, stats);
  var filteredChoices = filterChoices(adventure.choices || [], state);
  var screen = adventure.screen || {};
  return {
    id: adventure.id,
    title: resolveTemplate(screen.title || '', context),
    subtitle: resolveTemplate(screen.subtitle === 'welcomeMessage' ? context.welcomeMessage : screen.subtitle || '', context),
    detail: screen.detail ? resolveTemplate(screen.detail, context) : null,
    art: screen.art || null,
    prompt: resolveTemplate(adventure.prompt || 'Choose an option:', context),
    choices: filteredChoices.map(function(ch) {
      return Object.assign({}, ch, { label: resolveTemplate(ch.label, context), description: resolveTemplate(ch.description || '', context) });
    }),
    action: adventure.action || null,
    afterAction: adventure.afterAction || null,
    subAdventures: adventure.subAdventures || null,
  };
}

function matchChoice(choices, input) {
  var normalized = input.trim().toLowerCase();
  return choices.find(function(ch) { return ch.key.toLowerCase() === normalized; }) || null;
}

module.exports = {
  loadAdventure: loadAdventure, resolveTemplate: resolveTemplate, evaluateCondition: evaluateCondition,
  filterChoices: filterChoices, buildContext: buildContext, prepareAdventure: prepareAdventure,
  matchChoice: matchChoice, resolveGitData: resolveGitData, ADVENTURES_DIR: ADVENTURES_DIR,
};
