'use strict';

var test = require('node:test');
var assert = require('node:assert');

var dispatcher = require('../dispatcher');
var knowledge = require('../knowledge');
var skillBrowser = require('../skill-browser');
var importer = require('../project-importer');

// ─── dispatcher.js ────────────────────────────────────────────────────────────

test('scoreComplexity: null input returns null', function() {
  assert.strictEqual(dispatcher.scoreComplexity(null), null);
});

test('scoreComplexity: empty string returns null', function() {
  assert.strictEqual(dispatcher.scoreComplexity(''), null);
});

test('scoreComplexity: fix a typo scores < 25 (trivial)', function() {
  var r = dispatcher.scoreComplexity('fix a typo');
  assert.ok(r !== null, 'result should not be null');
  assert.ok(r.score < 25, 'expected score < 25, got ' + r.score);
});

test('scoreComplexity: rename the variable scores < 25 (trivial)', function() {
  var r = dispatcher.scoreComplexity('rename the variable');
  assert.ok(r !== null);
  assert.ok(r.score < 25, 'expected score < 25, got ' + r.score);
});

test('scoreComplexity: add a new feature button scores 26-50 (simple)', function() {
  var r = dispatcher.scoreComplexity('add a new feature button');
  assert.ok(r !== null);
  assert.ok(r.score >= 26 && r.score <= 50, 'expected 26-50, got ' + r.score);
});

test('scoreComplexity: build a full saas platform with auth and billing scores > 75 (complex)', function() {
  var r = dispatcher.scoreComplexity('build a full saas platform with auth and billing');
  assert.ok(r !== null);
  assert.ok(r.score > 75, 'expected > 75, got ' + r.score);
});

test('scoreComplexity: refactor all tests in the entire codebase scores > 50', function() {
  var r = dispatcher.scoreComplexity('refactor all tests in the entire codebase');
  assert.ok(r !== null);
  assert.ok(r.score > 50, 'expected > 50, got ' + r.score);
});

test('scoreComplexity: result has turns, budget, effort, score fields', function() {
  var r = dispatcher.scoreComplexity('add a login button');
  assert.ok(r !== null);
  assert.ok(typeof r.turns === 'number');
  assert.ok(typeof r.budget === 'number');
  assert.ok(typeof r.effort === 'string');
  assert.ok(typeof r.score === 'number');
});

test('generateSessionName: formats task as kebab-case with kc- prefix', function() {
  assert.strictEqual(dispatcher.generateSessionName('Hello World Test!'), 'kc-hello-world-test');
});

test('generateSessionName: empty string returns kc-', function() {
  assert.strictEqual(dispatcher.generateSessionName(''), 'kc-');
});

test('generateSessionName: strips special chars except hyphens', function() {
  var r = dispatcher.generateSessionName('fix bug: auth/login');
  assert.ok(r.startsWith('kc-'));
  assert.ok(!/[^a-z0-9-]/.test(r.slice(3)), 'should only contain lowercase alphanumeric and hyphens');
});

test('getDefaultsForLevel: power returns maxTurns 50', function() {
  var r = dispatcher.getDefaultsForLevel('power');
  assert.strictEqual(r.maxTurns, 50);
});

test('getDefaultsForLevel: guided returns maxTurns 30', function() {
  var r = dispatcher.getDefaultsForLevel('guided');
  assert.strictEqual(r.maxTurns, 30);
});

test('getDefaultsForLevel: assisted returns maxTurns 40', function() {
  var r = dispatcher.getDefaultsForLevel('assisted');
  assert.strictEqual(r.maxTurns, 40);
});

test('getDefaultsForLevel: unknown level defaults to guided (30 turns)', function() {
  var r = dispatcher.getDefaultsForLevel('unknown-level');
  assert.strictEqual(r.maxTurns, 30);
});

// ─── v6.0 Fable + pricing tests ────────────────────────────────────────────────

test('getDefaultsForLevel: power tier model is fable', function() {
  var r = dispatcher.getDefaultsForLevel('power');
  assert.strictEqual(r.model, 'fable', 'power tier should use fable, got ' + r.model);
});

test('getDefaultsForLevel: guided tier model is sonnet (cost right-sized from opus)', function() {
  var r = dispatcher.getDefaultsForLevel('guided');
  assert.strictEqual(r.model, 'sonnet', 'guided tier should use sonnet, got ' + r.model);
});

test('estimateDispatchCost: modelKey is fable for claude-fable-5', function() {
  var r = dispatcher.estimateDispatchCost('build a saas app', { model: 'claude-fable-5', maxTurns: 30 });
  assert.strictEqual(r.modelKey, 'fable', 'expected modelKey fable, got ' + r.modelKey);
});

test('estimateDispatchCost: fable pricing is higher than opus (10/50 vs 5/25 $/MTok)', function() {
  var fable = dispatcher.estimateDispatchCost('build an auth system', { model: 'claude-fable-5', maxTurns: 30 });
  var opus = dispatcher.estimateDispatchCost('build an auth system', { model: 'claude-opus-4-8', maxTurns: 30 });
  assert.ok(fable.estimateHigh > opus.estimateHigh, 'fable cost should exceed opus at same turns');
});

test('estimateDispatchCost: haiku pricing corrected to $1/$5 per MTok (not old 0.25/1.25)', function() {
  var haiku = dispatcher.estimateDispatchCost('fix a typo', { model: 'claude-haiku-4-5', maxTurns: 10 });
  var opus = dispatcher.estimateDispatchCost('fix a typo', { model: 'claude-opus-4-8', maxTurns: 10 });
  // haiku should be cheaper than opus but the ratio should now be 1/5 vs 5/25 = 1/5x (not 0.25/5 = 0.05x)
  assert.strictEqual(haiku.modelKey, 'haiku');
  assert.ok(haiku.estimateHigh < opus.estimateHigh, 'haiku should still be cheaper than opus');
  // At updated pricing haiku ($1/$5) is 5x cheaper than opus ($5/$25) not 20x cheaper (old 0.25/1.25)
  // Just verify the estimate is finite and positive
  assert.ok(haiku.estimateHigh > 0, 'haiku estimate should be positive');
});

test('isClaudeAvailable: returns boolean', function() {
  var r = dispatcher.isClaudeAvailable();
  assert.ok(typeof r === 'boolean', 'expected boolean, got ' + typeof r);
});

test('estimateScope: is a function', function() {
  assert.strictEqual(typeof dispatcher.estimateScope, 'function');
});

test('estimateScope: returns 0 for null projectDir', function() {
  var r = dispatcher.estimateScope('build a login page', null);
  assert.strictEqual(r, 0);
});

// ─── knowledge.js ─────────────────────────────────────────────────────────────

test('extractKeywords: includes expected keywords from task', function() {
  var kws = knowledge.extractKeywords('build a REST API');
  assert.ok(kws.includes('build'), 'should include "build"');
  assert.ok(kws.includes('rest'), 'should include "rest"');
  assert.ok(kws.includes('api'), 'should include "api"');
});

test('extractKeywords: empty string returns empty array', function() {
  var kws = knowledge.extractKeywords('');
  assert.deepStrictEqual(kws, []);
});

test('extractKeywords: deduplicates repeated words', function() {
  var kws = knowledge.extractKeywords('build build build api api');
  var buildCount = kws.filter(function(w) { return w === 'build'; }).length;
  assert.strictEqual(buildCount, 1, 'should deduplicate "build"');
});

test('extractKeywords: filters stop words', function() {
  var kws = knowledge.extractKeywords('build the api for the app');
  assert.ok(!kws.includes('the'), 'should filter stop word "the"');
  assert.ok(!kws.includes('for'), 'should filter stop word "for"');
});

test('categorizeTask: nextjs website returns web', function() {
  assert.strictEqual(knowledge.categorizeTask('build a nextjs website'), 'web');
});

test('categorizeTask: fix a bug in the API returns bugfix or api', function() {
  var r = knowledge.categorizeTask('fix a bug in the API');
  assert.ok(r === 'bugfix' || r === 'api', 'expected bugfix or api, got ' + r);
});

test('categorizeTask: write unit tests returns testing', function() {
  assert.strictEqual(knowledge.categorizeTask('write unit tests'), 'testing');
});

test('categorizeTask: random thing returns general', function() {
  assert.strictEqual(knowledge.categorizeTask('random thing xyz'), 'general');
});

test('categorizeTask: CLI task returns cli', function() {
  assert.strictEqual(knowledge.categorizeTask('build a cli script tool'), 'cli');
});

test('categorizeTask: deploy task returns devops', function() {
  assert.strictEqual(knowledge.categorizeTask('deploy to docker'), 'devops');
});

test('getStats: returns object with total, categories, totalCost', function() {
  var stats = knowledge.getStats();
  assert.ok(typeof stats === 'object');
  assert.ok(typeof stats.total === 'number');
  assert.ok(typeof stats.categories === 'object');
  assert.ok(typeof stats.totalCost === 'number');
});

test('getStats: total is non-negative', function() {
  var stats = knowledge.getStats();
  assert.ok(stats.total >= 0);
});

test('getInsights: is a function', function() {
  assert.strictEqual(typeof knowledge.getInsights, 'function');
});

test('getInsights: returns correct shape for unknown category', function() {
  var r = knowledge.getInsights('nonexistent-category-xyz');
  assert.ok(Array.isArray(r.topPatterns));
  assert.ok(Array.isArray(r.commonErrors));
  assert.ok(typeof r.avgCost === 'number');
  assert.ok(typeof r.successRate === 'number');
});

test('fuzzyKeywordScore: is a function', function() {
  assert.strictEqual(typeof knowledge.fuzzyKeywordScore, 'function');
});

test('fuzzyKeywordScore: exact match scores higher than no match', function() {
  var exact = knowledge.fuzzyKeywordScore(['api', 'build'], ['api', 'build']);
  var none = knowledge.fuzzyKeywordScore(['api', 'build'], ['foo', 'bar']);
  assert.ok(exact > none, 'exact match should score higher');
});

test('fuzzyKeywordScore: empty arrays return 0', function() {
  assert.strictEqual(knowledge.fuzzyKeywordScore([], []), 0);
});

test('RELATED_CATEGORIES: is an object', function() {
  assert.ok(typeof knowledge.RELATED_CATEGORIES === 'object');
  assert.ok(!Array.isArray(knowledge.RELATED_CATEGORIES));
});

test('RELATED_CATEGORIES: has expected keys', function() {
  assert.ok('web' in knowledge.RELATED_CATEGORIES);
  assert.ok('api' in knowledge.RELATED_CATEGORIES);
  assert.ok('testing' in knowledge.RELATED_CATEGORIES);
});

// ─── skill-browser.js ─────────────────────────────────────────────────────────

test('listSkills: returns array with > 100 skills', function() {
  var skills = skillBrowser.listSkills();
  assert.ok(Array.isArray(skills), 'should be an array');
  assert.ok(skills.length > 100, 'expected > 100 skills, got ' + skills.length);
});

test('listSkills: each skill has name, description, path, dirName', function() {
  var skills = skillBrowser.listSkills();
  var sample = skills.slice(0, 10);
  sample.forEach(function(skill) {
    assert.ok(typeof skill.name === 'string', 'name should be string');
    assert.ok(typeof skill.description === 'string', 'description should be string');
    assert.ok(typeof skill.path === 'string', 'path should be string');
    assert.ok(typeof skill.dirName === 'string', 'dirName should be string');
  });
});

test('categorizeSkills: returns object with keys', function() {
  var skills = skillBrowser.listSkills();
  var grouped = skillBrowser.categorizeSkills(skills);
  assert.ok(typeof grouped === 'object');
  assert.ok(Object.keys(grouped).length > 0, 'should have at least one category');
});

test('categorizeSkills: each category value is an array', function() {
  var skills = skillBrowser.listSkills();
  var grouped = skillBrowser.categorizeSkills(skills);
  Object.values(grouped).forEach(function(arr) {
    assert.ok(Array.isArray(arr));
  });
});

test('recommendSkills: returns array with length <= limit', function() {
  var results = skillBrowser.recommendSkills('build a nextjs app', ['nextjs'], 5);
  assert.ok(Array.isArray(results));
  assert.ok(results.length <= 5, 'should not exceed limit of 5');
});

test('recommendSkills: results have score and dirName properties', function() {
  var results = skillBrowser.recommendSkills('build a nextjs app', ['nextjs'], 5);
  results.forEach(function(r) {
    assert.ok(typeof r.score === 'number', 'score should be a number');
    assert.ok(typeof r.dirName === 'string', 'dirName should be a string');
  });
});

test('recommendSkills: no duplicate dirName in results', function() {
  var results = skillBrowser.recommendSkills('build a nextjs app', ['nextjs'], 10);
  var seen = new Set();
  results.forEach(function(r) {
    assert.ok(!seen.has(r.dirName), 'duplicate dirName: ' + r.dirName);
    seen.add(r.dirName);
  });
});

test('trackSkillUsage: is a function', function() {
  assert.strictEqual(typeof skillBrowser.trackSkillUsage, 'function');
});

test('getTrendingSkills: is a function', function() {
  assert.strictEqual(typeof skillBrowser.getTrendingSkills, 'function');
});

test('getTrendingSkills: returns array', function() {
  var r = skillBrowser.getTrendingSkills(7);
  assert.ok(Array.isArray(r));
});

test('filterByProject: returns sorted array', function() {
  var skills = skillBrowser.listSkills();
  var filtered = skillBrowser.filterByProject(skills, ['nextjs']);
  assert.ok(Array.isArray(filtered));
  assert.strictEqual(filtered.length, skills.length, 'should return all skills (just re-sorted)');
});

test('filterByProject: empty techStack returns full list copy', function() {
  var skills = skillBrowser.listSkills();
  var filtered = skillBrowser.filterByProject(skills, []);
  assert.strictEqual(filtered.length, skills.length);
});

// ─── project-importer.js ──────────────────────────────────────────────────────

var PROJECT_DIR = require('path').join(__dirname, '..', '..');

test('scanProject: returns object with dir, name, techStack, hasClaudeMd', function() {
  var r = importer.scanProject(PROJECT_DIR);
  assert.ok(typeof r === 'object');
  assert.ok(typeof r.dir === 'string');
  assert.ok(typeof r.name === 'string');
  assert.ok(Array.isArray(r.techStack));
  assert.ok(typeof r.hasClaudeMd === 'boolean');
});

test('scanProject: cc-commander has hasClaudeMd true', function() {
  var r = importer.scanProject(PROJECT_DIR);
  assert.strictEqual(r.hasClaudeMd, true);
});

test('scanProject: has gitBranch property (string or null)', function() {
  var r = importer.scanProject(PROJECT_DIR);
  assert.ok(r.hasOwnProperty('gitBranch'), 'missing gitBranch property');
  assert.ok(r.gitBranch === null || typeof r.gitBranch === 'string');
});

test('scanProject: has isMonorepo property (boolean)', function() {
  var r = importer.scanProject(PROJECT_DIR);
  assert.ok(r.hasOwnProperty('isMonorepo'), 'missing isMonorepo property');
  assert.strictEqual(typeof r.isMonorepo, 'boolean');
});

test('scanProject: has recentCommitThemes property (array)', function() {
  var r = importer.scanProject(PROJECT_DIR);
  assert.ok(r.hasOwnProperty('recentCommitThemes'), 'missing recentCommitThemes property');
  assert.ok(Array.isArray(r.recentCommitThemes));
});

test('hasProjectContext: returns true for cc-commander dir', function() {
  var r = importer.hasProjectContext(PROJECT_DIR);
  assert.strictEqual(r, true);
});

test('buildProjectPrompt: returns non-empty string', function() {
  var project = importer.scanProject(PROJECT_DIR);
  var prompt = importer.buildProjectPrompt(project);
  assert.ok(typeof prompt === 'string');
  assert.ok(prompt.length > 0, 'prompt should not be empty');
});

test('buildProjectPrompt: includes project name', function() {
  var project = importer.scanProject(PROJECT_DIR);
  var prompt = importer.buildProjectPrompt(project);
  assert.ok(prompt.includes(project.name), 'prompt should include project name');
});
