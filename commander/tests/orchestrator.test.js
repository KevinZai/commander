'use strict';

var test = require('node:test');
var assert = require('node:assert');

var orchestrator = require('../orchestrator');

// ─── scoreTool ───────────────────────────────────────────────

test('scoreTool returns a number between 0 and 100', function() {
  var score = orchestrator.scoreTool(
    { vendor: 'gstack', skill: 'qa', description: 'Real browser QA testing' },
    { taskDescription: 'test the login page', phase: 'test' },
    { pinnedTools: {}, stackPreferences: [], toolHistory: [] }
  );
  assert.ok(typeof score === 'number', 'Score should be number');
  assert.ok(score >= 0, 'Score should be >= 0, got ' + score);
  assert.ok(score <= 100, 'Score should be <= 100, got ' + score);
});

test('scoreTool returns 0 for null capability', function() {
  var score = orchestrator.scoreTool(null, {}, {});
  assert.strictEqual(score, 0);
});

test('scoreTool returns 0 for capability missing vendor', function() {
  var score = orchestrator.scoreTool({ skill: 'qa' }, {}, {});
  assert.strictEqual(score, 0);
});

test('scoreTool gives higher score when task description matches skill', function() {
  var context = { taskDescription: 'review the code for security issues', phase: 'review' };
  var prefs = { pinnedTools: {}, stackPreferences: [], toolHistory: [] };
  var reviewScore = orchestrator.scoreTool(
    { vendor: 'gstack', skill: 'review', description: 'Code review' },
    context, prefs
  );
  var unrelatedScore = orchestrator.scoreTool(
    { vendor: 'gstack', skill: 'ship', description: 'Ship checklist' },
    context, prefs
  );
  assert.ok(reviewScore > unrelatedScore,
    'Review skill (' + reviewScore + ') should score higher than ship (' + unrelatedScore + ') for review task');
});

test('scoreTool boosts pinned preferences to 100 on preference component', function() {
  var cap = { vendor: 'gstack', skill: 'qa', description: 'QA testing' };
  var context = { taskDescription: 'test something', phase: 'test' };
  var pinnedPrefs = { pinnedTools: { test: 'gstack' }, stackPreferences: [], toolHistory: [] };
  var defaultPrefs = { pinnedTools: {}, stackPreferences: [], toolHistory: [] };
  var pinnedScore = orchestrator.scoreTool(cap, context, pinnedPrefs);
  var defaultScore = orchestrator.scoreTool(cap, context, defaultPrefs);
  assert.ok(pinnedScore > defaultScore,
    'Pinned (' + pinnedScore + ') should beat default (' + defaultScore + ')');
});

test('scoreTool boosts tools found in history', function() {
  var cap = { vendor: 'gstack', skill: 'qa', description: 'QA testing' };
  var context = { taskDescription: 'test something', phase: 'test' };
  var historyPrefs = {
    pinnedTools: {},
    stackPreferences: [],
    toolHistory: [{ vendor: 'gstack', skill: 'qa' }],
  };
  var emptyPrefs = { pinnedTools: {}, stackPreferences: [], toolHistory: [] };
  var historyScore = orchestrator.scoreTool(cap, context, historyPrefs);
  var emptyScore = orchestrator.scoreTool(cap, context, emptyPrefs);
  assert.ok(historyScore >= emptyScore,
    'History (' + historyScore + ') should be >= no history (' + emptyScore + ')');
});

// ─── rankToolsForPhase ───────────────────────────────────────

test('rankToolsForPhase returns a sorted array', function() {
  var ranked = orchestrator.rankToolsForPhase('test', { taskDescription: 'run tests' });
  assert.ok(Array.isArray(ranked), 'Should return array');
  if (ranked.length >= 2) {
    assert.ok(ranked[0].score >= ranked[1].score,
      'First item (' + ranked[0].score + ') should have highest score');
  }
});

test('rankToolsForPhase entries have required fields', function() {
  var ranked = orchestrator.rankToolsForPhase('execute', { taskDescription: 'build something' });
  if (ranked.length > 0) {
    var entry = ranked[0];
    assert.ok(typeof entry.vendor === 'string', 'Should have vendor');
    assert.ok(typeof entry.skill === 'string', 'Should have skill');
    assert.ok(typeof entry.score === 'number', 'Should have score');
    assert.ok(typeof entry.breakdown === 'object', 'Should have breakdown');
  }
});

// ─── pickBest ────────────────────────────────────────────────

test('pickBest returns single result or null', function() {
  var best = orchestrator.pickBest('test', { taskDescription: 'run qa tests' });
  if (best !== null) {
    assert.ok(typeof best.vendor === 'string', 'Should have vendor');
    assert.ok(typeof best.skill === 'string', 'Should have skill');
    assert.ok(typeof best.score === 'number', 'Should have score');
  }
});

test('pickBest returns null for empty vendor dir phase', function() {
  // Use a phase that might have no tools if vendor dir is empty
  // This still works because getCachedIndex handles empty gracefully
  var best = orchestrator.pickBest('nonexistent-phase', {});
  assert.strictEqual(best, null, 'Should return null for unknown phase');
});

// ─── pickWithFallback ────────────────────────────────────────

test('pickWithFallback returns at most 3 results', function() {
  var results = orchestrator.pickWithFallback('execute', { taskDescription: 'build an app' });
  assert.ok(Array.isArray(results), 'Should return array');
  assert.ok(results.length <= 3, 'Should have at most 3 results, got ' + results.length);
});

// ─── loadUserPreferences ─────────────────────────────────────

test('loadUserPreferences returns object with expected shape', function() {
  var prefs = orchestrator.loadUserPreferences();
  assert.ok(typeof prefs === 'object', 'Should return object');
  assert.ok(typeof prefs.pinnedTools === 'object', 'Should have pinnedTools');
  assert.ok(Array.isArray(prefs.stackPreferences), 'Should have stackPreferences array');
  assert.ok(Array.isArray(prefs.toolHistory), 'Should have toolHistory array');
});

// ─── PACKAGE_META ────────────────────────────────────────────

test('PACKAGE_META contains expected packages', function() {
  var meta = orchestrator.PACKAGE_META;
  assert.ok(meta['gstack'], 'Should have gstack');
  assert.ok(meta['everything-claude-code'], 'Should have everything-claude-code');
  assert.ok(meta['superpowers'], 'Should have superpowers');
  assert.ok(typeof meta['gstack'].stars === 'number', 'Stars should be number');
  assert.ok(typeof meta['gstack'].updated === 'string', 'Updated should be string');
});
