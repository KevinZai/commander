'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('node:child_process');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');
var GENERATOR_PATH = path.join(ROOT, 'scripts', 'build-cockpit.mjs');
var CONTRACT_PATH = path.join(ROOT, 'commander', 'contract.json');
var PLUGIN_SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
var ECOSYSTEM_SKILLS_DIR = path.join(ROOT, 'skills');
var DATA_MARKER = '/*__COCKPIT_DATA__*/';

function walkFilesNamed(rootDir, filename) {
  var matches = [];

  function walk(currentDir) {
    fs.readdirSync(currentDir, { withFileTypes: true }).forEach(function(entry) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'vendor') return;
      var fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === filename) {
        matches.push(fullPath);
      }
    });
  }

  walk(rootDir);
  return matches;
}

function frontmatterName(filePath) {
  var markdown = fs.readFileSync(filePath, 'utf8');
  var match = /^name:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(markdown);
  return match ? match[1].trim() : path.basename(path.dirname(filePath));
}

function parsePayload(output) {
  var match = /window\.__COCKPIT__ = (.*);\n/.exec(output);
  assert.ok(match, 'generated document should contain the Cockpit payload');
  return JSON.parse(match[1]);
}

function runGenerator(home) {
  return cp.spawnSync(process.execPath, [GENERATOR_PATH], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
    env: Object.assign({}, process.env, { HOME: home }),
  });
}

function writeJsonl(home, relativePath, entries) {
  var filePath = path.join(home, '.claude', 'commander', relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, entries.map(function(entry) {
    return typeof entry === 'string' ? entry : JSON.stringify(entry);
  }).join('\n') + '\n');
}

function ago(days, minutes) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - (minutes || 0) * 60 * 1000).toISOString();
}

var generated = cp.spawnSync(process.execPath, [GENERATOR_PATH], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 5 * 1024 * 1024,
});
var output = generated.stdout;
var payload = generated.status === 0 ? parsePayload(output) : null;

test('generator runs successfully and emits more than 100KB', function() {
  assert.strictEqual(generated.status, 0, generated.stderr);
  assert.ok(Buffer.byteLength(output) > 100 * 1024, 'expected a document larger than 100KB');
});

test('generated document is self-contained', function() {
  assert.doesNotMatch(output, /\b(?:src|href)\s*=\s*["']\s*https?:\/\//i);
  assert.doesNotMatch(output, /<script\b[^>]*\bsrc\s*=/i);
});

test('payload counts match the contract and account for plugin-first dedup', function() {
  var contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  var pluginFiles = walkFilesNamed(PLUGIN_SKILLS_DIR, 'SKILL.md');
  var ecosystemFiles = walkFilesNamed(ECOSYSTEM_SKILLS_DIR, 'SKILL.md');
  var pluginIds = new Set(pluginFiles.map(frontmatterName));
  var dedupCount = ecosystemFiles.filter(function(filePath) {
    return pluginIds.has(path.basename(path.dirname(filePath)));
  }).length;
  var pluginShown = payload.skills.filter(function(skill) { return skill.source === 'plugin'; }).length;
  var ecosystemShown = payload.skills.filter(function(skill) { return skill.source === 'ecosystem'; }).length;

  assert.strictEqual(payload.meta.version, contract.version);
  assert.strictEqual(payload.meta.pluginSkills, contract.plugin_skills);
  assert.strictEqual(payload.meta.ecosystemSkills, contract.ecosystem_skills);
  assert.strictEqual(payload.meta.agents, contract.specialist_agents);
  assert.strictEqual(payload.meta.pluginSkills, 78);
  assert.strictEqual(payload.meta.ecosystemSkills, 467);
  assert.strictEqual(pluginShown, payload.meta.pluginSkills);
  assert.strictEqual(ecosystemShown + dedupCount, payload.meta.ecosystemSkills);
  assert.strictEqual(payload.skills.length, 78 + 467 - dedupCount);
  assert.strictEqual(payload.agents.length, payload.meta.agents);
});

test('every idea command resolves to a displayed skill', function() {
  var commands = new Set();
  payload.skills.forEach(function(skill) {
    commands.add(skill.cmd);
    commands.add(skill.id);
  });

  assert.strictEqual(payload.ideas.length, 60);
  payload.ideas.forEach(function(idea) {
    assert.ok(commands.has(idea.cmd), 'unresolved idea command: ' + idea.cmd);
  });
});

test('prompt patterns contain the exact six keys and valid regex sources', function() {
  var expectedKeys = ['artifact', 'format', 'outcome', 'reference', 'selfcheck', 'target'];
  var actualKeys = payload.patterns.map(function(pattern) { return pattern.key; }).sort();

  assert.strictEqual(payload.patterns.length, 6);
  assert.deepStrictEqual(actualKeys, expectedKeys);
  payload.patterns.forEach(function(pattern) {
    assert.doesNotThrow(function() { return new RegExp(pattern.test, 'i'); }, pattern.key);
  });
});

test('template marker is replaced and the document has one title', function() {
  assert.ok(!output.includes(DATA_MARKER));
  assert.strictEqual((output.match(/<title(?:\s|>)/gi) || []).length, 1);
});

test('generator contains a loud contract-count guard', function() {
  var source = fs.readFileSync(GENERATOR_PATH, 'utf8');
  assert.match(source, /function assertContractCounts\s*\(/);
  assert.match(source, /Cockpit contract count mismatch; refusing to emit/);
});

test('analytics aggregates local JSONL activity into the documented payload shape', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-analytics-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });

  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(0, 3), agent: 'builder', durationMs: 1000, inputTokens: 1000, outputTokens: 100 },
    '{bad json',
    { ts: ago(1), agent: 'builder', durationMs: 3000, inputTokens: 2000, outputTokens: 200 },
    { ts: ago(10), agent: 'reviewer', durationMs: 9000, inputTokens: 500, outputTokens: 50 },
    { ts: ago(31), agent: 'architect', durationMs: 1, inputTokens: 999999, outputTokens: 999999 },
  ]);
  writeJsonl(home, 'subagent-runs.jsonl', [
    { ts: ago(0), agent_name: 'builder', session_id: 'starts-only-source' },
  ]);
  writeJsonl(home, 'tasks.jsonl', [
    { ts: ago(0), task_id: 'done', status: 'completed' },
    { ts: ago(0), task_id: 'open', status: 'in_progress' },
    { ts: ago(8), task_id: 'old', status: 'completed' },
  ]);
  writeJsonl(home, 'skill-runs.jsonl', [
    { ts: ago(0), skill: 'ccc-browse' },
    { ts: ago(1), skill: 'ccc-browse' },
    { ts: ago(10), skill: 'ccc-debug' },
  ]);
  writeJsonl(home, path.join('mission-control', 'events.jsonl'), [
    { ts: ago(0), type: 'delegation', session_id: 'abcdefgh-extra', from: 'legacy-source', actor: 'builder' },
    { ts: ago(0), type: 'delegation', session_id: 'abcdefgh-other', actor: 'builder' },
    { ts: ago(0), type: 'workflow', tool: 'Workflow' },
    { ts: ago(0), type: 'message', session_id: 'ignored', actor: 'reviewer' },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var analytics = parsePayload(result.stdout).analytics;
  var tiles = Object.fromEntries(analytics.tiles.map(function(tile) { return [tile.label, tile.value]; }));
  var builder = analytics.topAgents.find(function(agent) { return agent.name === 'builder'; });

  assert.strictEqual(tiles['Agent runs (7d)'], 2);
  assert.strictEqual(tiles['Tokens (7d)'], '3k');
  assert.strictEqual(tiles['Est cost (7d)'], '$0.01 est');
  assert.strictEqual(tiles['Skill launches (7d)'], 2);
  assert.strictEqual(tiles['Tasks done (7d)'], 1);
  assert.strictEqual(tiles['Most-used skill (30d)'], 'ccc-browse ×2 · ccc-debug ×1');
  assert.strictEqual(analytics.daily.length, 14);
  assert.strictEqual(analytics.daily.reduce(function(sum, day) { return sum + day.runs; }, 0), 3);
  assert.deepStrictEqual(builder, {
    name: 'builder',
    emoji: '🔨',
    runs: 2,
    tokens: 3300,
    costUsd: 0.0135,
    avgMs: 2000,
  });
  assert.deepStrictEqual(analytics.topAgents.map(function(agent) { return agent.name; }), ['builder', 'reviewer']);
  // Distinct sessions stay distinct (the old 8-char prefix both leaked ids AND
  // merged different sessions on prefix collisions — anonymized labels fix both).
  var flowKey = function(flow) { return flow.from + '|' + flow.to; };
  assert.deepStrictEqual(
    analytics.flows.slice().sort(function(a, b) { return flowKey(a) < flowKey(b) ? -1 : 1; }),
    [
      { from: 'session-1', to: 'builder', count: 1 },
      { from: 'session-2', to: 'builder', count: 1 },
      { from: 'session', to: 'Workflow', count: 1 },
    ]
  );
});

test('task analytics counts each task once from its latest explicit completion state', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-task-states-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });

  writeJsonl(home, 'tasks.jsonl', [
    { ts: ago(2), task_id: 'duplicate', status: 'completed' },
    { ts: ago(1), task_id: 'duplicate', status: 'completed' },
    { ts: ago(2), task_id: 'reopened', status: 'completed' },
    { ts: ago(0), task_id: 'reopened', status: 'in_progress' },
    { ts: ago(0), task_id: 'incomplete', status: 'incomplete' },
    { ts: ago(0), task_id: 'not-done', status: 'not_done' },
    { ts: ago(0), status: 'completed' },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var analytics = parsePayload(result.stdout).analytics;
  var tiles = Object.fromEntries(analytics.tiles.map(function(tile) { return [tile.label, tile.value]; }));
  assert.strictEqual(tiles['Tasks done (7d)'], 1);
});

test('analytics is an empty object when local activity sources are empty', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-empty-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(parsePayload(result.stdout).analytics, {});
});
