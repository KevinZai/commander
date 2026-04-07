'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');

var pkg = require('../../package.json');
var adventure = require('../adventure');
var state = require('../state');
var tui = require('../tui');
var dispatcher = require('../dispatcher');
var knowledge = require('../knowledge');
var plugins = require('../plugins');
var skillBrowser = require('../skill-browser');
var branding = require('../branding');

var ADVENTURES_DIR = path.join(__dirname, '..', 'adventures');

// ─── Adventure Files ──────────────────────────────────────────

test('All adventure files are valid JSON with required fields', function() {
  var files = fs.readdirSync(ADVENTURES_DIR).filter(function(f) { return f.endsWith('.json'); });
  assert.ok(files.length >= 11, 'Expected at least 11 adventure files, got ' + files.length);

  files.forEach(function(f) {
    var content = fs.readFileSync(path.join(ADVENTURES_DIR, f), 'utf8');
    var adv = JSON.parse(content); // Throws if invalid JSON
    assert.ok(adv.id, f + ' missing id');
    assert.ok(adv.choices || adv.action, f + ' missing choices or action');
  });
});

test('No dead-end navigation paths', function() {
  var files = fs.readdirSync(ADVENTURES_DIR).filter(function(f) { return f.endsWith('.json'); });
  var adventures = {};
  files.forEach(function(f) {
    var a = JSON.parse(fs.readFileSync(path.join(ADVENTURES_DIR, f), 'utf8'));
    adventures[a.id] = a;
  });

  var dead = [];
  Object.keys(adventures).forEach(function(id) {
    var a = adventures[id];
    (a.choices || []).forEach(function(c) {
      if (c.next && !adventures[c.next] && !(a.subAdventures && a.subAdventures[c.next])) {
        dead.push(id + ' -> ' + c.next);
      }
    });
    if (a.afterAction && a.afterAction.choices) {
      a.afterAction.choices.forEach(function(c) {
        if (c.next && !adventures[c.next] && !(a.subAdventures && a.subAdventures[c.next])) {
          dead.push(id + ' -> ' + c.next);
        }
      });
    }
  });

  assert.strictEqual(dead.length, 0, 'Dead ends found: ' + dead.join(', '));
});

// ─── Adventure Engine ─────────────────────────────────────────

test('buildContext returns all expected fields', function() {
  var ctx = adventure.buildContext(
    { user: { name: 'Test', level: 'power', sessionsCompleted: 10 }, activeSession: null },
    { streak: { current: 5, longest: 10 }, totalCost: 3.50, achievements: ['a', 'b'], totalSessions: 10 }
  );
  assert.ok(ctx.name === 'Test');
  assert.ok(ctx.streak === 5);
  assert.ok(ctx.longestStreak === 10);
  assert.ok(ctx.achievementCount === 2);
  assert.ok(ctx.totalCost === '$3.50');
  assert.ok(typeof ctx.gitBranch === 'string');
  assert.ok(typeof ctx.gitStatus === 'string');
});

test('prepareAdventure resolves templates and filters choices', function() {
  var mainMenu = adventure.loadAdventure('main-menu');
  assert.ok(mainMenu, 'main-menu.json should load');

  var prepared = adventure.prepareAdventure(mainMenu,
    { user: { name: 'Kevin', level: 'guided', sessionsCompleted: 0 }, activeSession: null },
    {}
  );
  assert.ok(prepared.subtitle.includes('Kevin'));
  assert.ok(prepared.choices.length > 0);
  // hasActiveSession = false, so "Continue" should be filtered out
  var continueChoice = prepared.choices.find(function(c) { return c.key === 'a'; });
  assert.ok(!continueChoice, 'Continue should be filtered when no active session');
});

test('matchChoice finds choices case-insensitively', function() {
  var choices = [{ key: 'a', label: 'Test' }, { key: 'B', label: 'Other' }];
  assert.ok(adventure.matchChoice(choices, 'a'));
  assert.ok(adventure.matchChoice(choices, 'A'));
  assert.ok(adventure.matchChoice(choices, 'b'));
  assert.ok(!adventure.matchChoice(choices, 'z'));
});

// ─── Dispatcher ───────────────────────────────────────────────

test('generateSessionName creates valid slugs', function() {
  assert.ok(dispatcher.generateSessionName('Build a REST API').startsWith('kc-'));
  assert.ok(!dispatcher.generateSessionName('Test!@#$').includes('!'));
  assert.ok(dispatcher.generateSessionName('A very long task description that should be truncated at forty chars or so').length <= 50);
});

test('getDefaultsForLevel returns correct tiers', function() {
  var guided = dispatcher.getDefaultsForLevel('guided');
  var power = dispatcher.getDefaultsForLevel('power');
  assert.ok(guided.maxBudgetUsd < power.maxBudgetUsd);
  assert.ok(guided.effort === 'medium');
  assert.ok(power.effort === 'high');
});

// ─── Knowledge ────────────────────────────────────────────────

test('extractKeywords removes stop words and dedupes', function() {
  var kw = knowledge.extractKeywords('Build a REST API with auth and the database');
  assert.ok(kw.includes('build'));
  assert.ok(kw.includes('rest'));
  assert.ok(!kw.includes('a'));
  assert.ok(!kw.includes('the'));
});

test('categorizeTask identifies task types', function() {
  assert.ok(knowledge.categorizeTask('Build a website with React') === 'web');
  assert.ok(knowledge.categorizeTask('Create a REST API') === 'api');
  assert.ok(knowledge.categorizeTask('Write a blog post') === 'content');
  assert.ok(knowledge.categorizeTask('Fix the login bug') === 'bugfix');
  assert.ok(knowledge.categorizeTask('Deploy to AWS') === 'devops');
});

// ─── Plugins ──────────────────────────────────────────────────

test('detectPlugins returns valid structure', function() {
  var d = plugins.detectPlugins();
  assert.ok(Array.isArray(d.installed));
  assert.ok(Array.isArray(d.missing));
  assert.ok(typeof d.phaseTools === 'object');
  assert.ok(Object.keys(d.phaseTools).length === 8);
});

test('buildDispatchPlan covers all 8 phases', function() {
  var d = plugins.detectPlugins();
  var plan = plugins.buildDispatchPlan(d);
  assert.ok(plan.length === 8);
  plan.forEach(function(step) {
    assert.ok(step.id);
    assert.ok(step.name);
    assert.ok(step.fallback);
  });
});

// ─── Skill Browser ────────────────────────────────────────────

test('listSkills finds skills on disk', function() {
  var skills = skillBrowser.listSkills();
  assert.ok(skills.length > 100, 'Expected 100+ skills, got ' + skills.length);
});

test('listSkills finds CCC domain skills', function() {
  var skills = skillBrowser.listSkills();
  var domains = skills.filter(function(s) { return s.isMega; });
  assert.ok(domains.length >= 10, 'Expected 10+ CCC domains, got ' + domains.length);
});

// ─── TUI ──────────────────────────────────────────────────────

test('renderLogo returns non-empty string', function() {
  var logo = tui.renderLogo('TEST');
  assert.ok(logo.length > 10, 'Logo should be substantial');
});

test('gradient produces colored text', function() {
  var g = tui.gradient('Hello', [[255, 0, 0], [0, 0, 255]]);
  assert.ok(g.includes('\x1b['));
});

test('all 4 themes are available', function() {
  var names = tui.getThemeNames();
  assert.ok(names.includes('cyberpunk'));
  assert.ok(names.includes('fire'));
  assert.ok(names.includes('graffiti'));
  assert.ok(names.includes('futuristic'));
});

test('renderSession handles malformed session fields safely', function() {
  var Engine = require('../engine');
  var engine = new Engine();
  var rendered = engine.renderSession({
    task: 42,
    cost: 'not-a-number',
    duration: 'bad',
    startTime: 'not-a-date',
    status: null,
  });
  assert.ok(typeof rendered === 'string');
  assert.ok(rendered.includes('Untitled'));
  assert.ok(rendered.includes('$0.00'));
  assert.ok(rendered.includes('Unknown date'));
});

// ─── Branding ─────────────────────────────────────────────────

test('branding has correct product name and tagline', function() {
  assert.ok(branding.product === 'Claude Code Commander');
  assert.ok(branding.tagline.includes('One install'));
  assert.ok(branding.version === pkg.version);
});

// ─── State ────────────────────────────────────────────────────

test('getUserLevel returns correct progressive levels', function() {
  assert.ok(state.getUserLevel({ user: { level: 'guided', sessionsCompleted: 0 } }) === 'guided');
  assert.ok(state.getUserLevel({ user: { level: 'guided', sessionsCompleted: 5 } }) === 'assisted');
  assert.ok(state.getUserLevel({ user: { level: 'guided', sessionsCompleted: 20 } }) === 'power');
  assert.ok(state.getUserLevel({ user: { level: 'power', sessionsCompleted: 0 } }) === 'power');
});
