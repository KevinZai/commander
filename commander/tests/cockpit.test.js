'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('node:child_process');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');
// v7.3.0, W2+/codex 7 — the real builder now ships INSIDE the plugin so a
// marketplace-only install can regenerate the Cockpit; GENERATOR_PATH points
// at that canonical location. SHIM_GENERATOR_PATH is the repo-root
// dev-muscle-memory shim (a thin spawn wrapper) — see the "shim parity"
// describe block below for the test that keeps the two in sync.
var GENERATOR_PATH = path.join(ROOT, 'commander', 'cowork-plugin', 'scripts', 'build-cockpit.mjs');
var SHIM_GENERATOR_PATH = path.join(ROOT, 'scripts', 'build-cockpit.mjs');
var CONTRACT_PATH = path.join(ROOT, 'commander', 'contract.json');
var PLUGIN_SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
var ECOSYSTEM_SKILLS_DIR = path.join(ROOT, 'skills');
var DATA_MARKER = '/*__COCKPIT_DATA__*/';
var BRAND_MARKER = '/*__BRAND_CSS__*/';
var TEMPLATE_PATH = path.join(ROOT, 'commander', 'cowork-plugin', 'lib', 'cockpit-template.html');
// v7.3.0, W5/Item 15 — Prompts tab: 4 vendored JSON sources shipped inside
// the plugin (lib/prompts-data/), normalized by buildPrompts() into
// payload.prompts.entries.
var PROMPTS_DATA_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'lib', 'prompts-data');
var COWORK_PLUGIN_DIR = path.join(ROOT, 'commander', 'cowork-plugin');

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

function writeJson(home, relativePath, data) {
  var filePath = path.join(home, '.claude', 'commander', relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
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
  assert.strictEqual(payload.meta.pluginSkills, 81);
  assert.strictEqual(payload.meta.ecosystemSkills, 467);
  assert.strictEqual(pluginShown, payload.meta.pluginSkills);
  assert.strictEqual(ecosystemShown + dedupCount, payload.meta.ecosystemSkills);
  assert.strictEqual(payload.skills.length, 81 + 467 - dedupCount);
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

test('prompt patterns are the multi-select enhance strategies with valid regex + a directive each', function() {
  var expectedKeys = [
    'artifact', 'constraints', 'context', 'examples', 'format', 'outcome',
    'planfirst', 'reference', 'role', 'selfcheck', 'target',
  ];
  var actualKeys = payload.patterns.map(function(pattern) { return pattern.key; }).sort();

  assert.strictEqual(payload.patterns.length, 11);
  assert.deepStrictEqual(actualKeys, expectedKeys);
  payload.patterns.forEach(function(pattern) {
    assert.doesNotThrow(function() { return new RegExp(pattern.test, 'i'); }, pattern.key);
    // Each strategy must carry a non-empty directive — that's what GO appends.
    assert.strictEqual(typeof pattern.directive, 'string', pattern.key + ' directive type');
    assert.ok(pattern.directive.trim().length > 0, pattern.key + ' directive non-empty');
  });
});

test('tools payload — Commander surfaces, all-MIT companions, and artifact recipes', function() {
  var t = payload.tools;
  assert.ok(t && typeof t === 'object', 'tools payload present');
  assert.ok(Array.isArray(t.surfaces) && t.surfaces.length >= 3, 'surfaces present');
  assert.ok(Array.isArray(t.companions) && t.companions.length >= 3, 'companions present');
  assert.ok(Array.isArray(t.recipes) && t.recipes.length >= 3, 'recipes present');
  // Kevin's requirement: companion apps are MIT-only.
  t.companions.forEach(function(c) {
    assert.strictEqual(c.license, 'MIT', c.name + ' must be MIT');
    assert.match(c.url, /^https:\/\/github\.com\//, c.name + ' url');
    assert.ok(c.desc && c.desc.length > 10, c.name + ' desc');
  });
  t.surfaces.forEach(function(s) { assert.match(s.run, /^\/ccc-/, s.name + ' runs a /ccc- command'); });
  t.recipes.forEach(function(r) { assert.ok(r.prompt && r.prompt.length > 40, r.name + ' has a prompt'); });
});

test('tools tab is wired and companion links stay self-contained (data-copy, not href)', function() {
  assert.ok(output.includes('data-tab="tools"'), 'tools nav button');
  assert.ok(output.includes('id="tab-tools"'), 'tools section');
  // Companion URLs live in the embedded JSON payload and become a clipboard
  // data-copy at runtime — they must NEVER be baked into an external href/src
  // (assertSelfContained enforces this at build; assert it here too).
  assert.ok(output.includes('github.com/nimbalyst/nimbalyst'), 'companion url present in payload');
  assert.doesNotMatch(output, /\b(?:src|href)\s*=\s*["']?https?:\/\//i, 'no external src/href');
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
  // topSkills = the shared Mission Control reader (top-skills.js), not a second
  // local parser. Sorted runs7d desc; carries bySource for Claude+Codex split.
  assert.deepStrictEqual(analytics.topSkills, [
    { skill: 'ccc-browse', runs7d: 2, runs30d: 2, bySource: { 'claude-code': 2 } },
    { skill: 'ccc-debug', runs7d: 0, runs30d: 1, bySource: { 'claude-code': 1 } },
  ]);
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

// ---------------------------------------------------------------------------
// Linear payload states — readLinearBoard() bakes ~/.claude/commander/
// linear-board.json into window.__COCKPIT__.linear at build time. It is a
// PRIVATE opt-in surface, so absent/empty/malformed/malicious input must all
// resolve to a well-formed, safely-encoded payload.
// ---------------------------------------------------------------------------

test('linear payload is {connected:false} when linear-board.json is absent', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-linear-absent-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var linear = parsePayload(result.stdout).linear;
  assert.deepStrictEqual(linear, { connected: false });
});

test('linear payload is well-formed and not connected for an empty tickets array', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-linear-empty-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJson(home, 'linear-board.json', { tickets: [] });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var linear = parsePayload(result.stdout).linear;
  assert.deepStrictEqual(linear, { connected: false, board: null, tickets: [] });
});

test('linear payload drops malformed ticket entries and keeps + defaults valid ones', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-linear-malformed-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJson(home, 'linear-board.json', {
    board: 'CC Team',
    tickets: [
      'not-an-object',
      42,
      null,
      ['array', 'not', 'object'],
      { title: 'missing id field' },
      { id: '', title: 'empty id is falsy, also dropped' },
      { id: 'CC-1', title: 'Valid ticket', state: 'In Progress', stateKind: 'in_progress', project: 'Cockpit', updated: '2026-07-18', stale: true },
      { id: 'CC-2', title: 'Partial fields default to empty strings' },
    ],
  });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var linear = parsePayload(result.stdout).linear;
  assert.strictEqual(linear.connected, true);
  assert.strictEqual(linear.board, 'CC Team');
  assert.strictEqual(linear.tickets.length, 2);
  assert.deepStrictEqual(linear.tickets[0], {
    id: 'CC-1', title: 'Valid ticket', state: 'In Progress', stateKind: 'in_progress',
    project: 'Cockpit', updated: '2026-07-18', stale: true,
  });
  assert.deepStrictEqual(linear.tickets[1], {
    id: 'CC-2', title: 'Partial fields default to empty strings', state: '', stateKind: '',
    project: '', updated: '', stale: false,
  });
});

test('linear payload safely encodes malicious ticket field values', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-linear-xss-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  var payloadStr = '</script><img src=x onerror=alert(1)>';
  writeJson(home, 'linear-board.json', {
    board: 'CC',
    tickets: [{ id: 'MAL-1', title: payloadStr, state: payloadStr, stateKind: 'in_progress' }],
  });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);

  // The raw, unescaped attack string must never appear in the emitted
  // document — it would prematurely close the <script> block that carries
  // window.__COCKPIT__ and let the <img onerror> execute as live markup.
  assert.ok(!result.stdout.includes('</script><img src=x onerror=alert(1)>'),
    'raw unescaped </script> breakout must not appear in the built output');
  // build-cockpit.mjs escapes every "</script" occurrence in the JSON blob to
  // "<\/script" before embedding it, which is what keeps the payload inert.
  assert.ok(result.stdout.includes('<\\/script><img src=x onerror=alert(1)>'),
    'the malicious string should survive JSON-encoded with </script escaped');

  // And it must still round-trip losslessly for legitimate consumers: once a
  // browser JSON.parses the payload, the ticket text is exactly what was fed in.
  var linear = parsePayload(result.stdout).linear;
  var ticket = linear.tickets.find(function(t) { return t.id === 'MAL-1'; });
  assert.strictEqual(ticket.title, payloadStr);
  assert.strictEqual(ticket.state, payloadStr);
});

// ---------------------------------------------------------------------------
// Template markers — both are replaced exactly once; the template itself
// must define each exactly once so the build's own "exactly one marker"
// guard (build-cockpit.mjs) has something unambiguous to replace.
// ---------------------------------------------------------------------------

test('template defines each marker exactly once and the build removes both', function() {
  var template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.strictEqual(countOccurrences(template, BRAND_MARKER), 1, 'template should contain exactly one BRAND_CSS marker');
  assert.strictEqual(countOccurrences(template, DATA_MARKER), 1, 'template should contain exactly one COCKPIT_DATA marker');
  assert.ok(!output.includes(BRAND_MARKER), 'built output must not contain the literal brand-css marker');
  assert.ok(!output.includes(DATA_MARKER), 'built output must not contain the literal cockpit-data marker');
});

// ---------------------------------------------------------------------------
// Brand tokens — the built CSS must carry the commanderplugin.com coral
// palette from commander/cowork-plugin/lib/brand-css.js, not a placeholder.
// ---------------------------------------------------------------------------

test('built output carries the coral brand palette tokens', function() {
  assert.match(output, /--primary:\s*#FF6B47/, 'expected --primary to be set to the brand coral');
  assert.match(output, /--bg:\s*#0F0F0F/, 'expected --bg to be set to the brand near-black');
  assert.ok(output.includes('#FF6B47'), 'expected the literal coral hex to appear in the built CSS');
});

// ---------------------------------------------------------------------------
// Self-contained — assertSelfContained() enforces some of this at build time
// (external src/href, <script src>, marker leftovers); this test also covers
// @import and protocol-relative refs, which the build-time guard does not.
// ---------------------------------------------------------------------------

test('built output has no external or protocol-relative asset references', function() {
  assert.doesNotMatch(output, /\b(?:src|href)\s*=\s*["']?\s*https?:\/\//i);
  assert.doesNotMatch(output, /url\(\s*["']?\s*https?:\/\//i);
  assert.doesNotMatch(output, /\b(?:src|href)\s*=\s*["']?\/\//);
  assert.doesNotMatch(output, /url\(\s*["']?\/\//);

  // @import is scoped to the real <style> block rather than the whole
  // document: skill/agent descriptions in the __COCKPIT__ data legitimately
  // mention "@import" as documentation prose (e.g. the tailwind-v4 skill
  // describing CSS-based config), which is not a live external CSS import.
  var styleMatch = /<style>([\s\S]*?)<\/style>/.exec(output);
  assert.ok(styleMatch, 'expected a <style> block in the built output');
  assert.doesNotMatch(styleMatch[1], /@import/i);
});

// ---------------------------------------------------------------------------
// Telemetry honesty — hasTokenData() governs whether a run's tokens count
// toward the Tokens/Est-cost tiles and a topAgents entry. A bare 0 (or an
// explicit tokensAvailable:false) must never render as a measured-looking
// '0' / '$0.00' — only real, positive token data may.
// ---------------------------------------------------------------------------

test('telemetry tiles and topAgents render honest "unavailable" markers for zero-token-only runs', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-telemetry-zero-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(0), agent: 'ghost', durationMs: 500, inputTokens: 0, outputTokens: 0 },
    { ts: ago(0, 5), agent: 'ghost', durationMs: 500, tokensAvailable: false },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var analytics = parsePayload(result.stdout).analytics;
  var tiles = Object.fromEntries(analytics.tiles.map(function(tile) { return [tile.label, tile.value]; }));
  var ghost = analytics.topAgents.find(function(agent) { return agent.name === 'ghost'; });

  assert.strictEqual(tiles['Tokens (7d)'], '— unavailable');
  assert.strictEqual(tiles['Est cost (7d)'], '—');
  assert.strictEqual(ghost.runs, 2);
  assert.strictEqual(ghost.tokens, null);
  assert.strictEqual(ghost.costUsd, null);
});

test('telemetry tiles and topAgents render real numbers once a run carries positive token data', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-telemetry-real-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(0), agent: 'ghost', durationMs: 500, inputTokens: 0, outputTokens: 0 },
    { ts: ago(0, 5), agent: 'ghost', durationMs: 1500, inputTokens: 1000, outputTokens: 200 },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var analytics = parsePayload(result.stdout).analytics;
  var tiles = Object.fromEntries(analytics.tiles.map(function(tile) { return [tile.label, tile.value]; }));
  var ghost = analytics.topAgents.find(function(agent) { return agent.name === 'ghost'; });

  assert.strictEqual(tiles['Tokens (7d)'], '1k');
  assert.strictEqual(tiles['Est cost (7d)'], '$0.01 est');
  assert.strictEqual(ghost.runs, 2);
  assert.strictEqual(ghost.tokens, 1200);
  assert.ok(ghost.tokens > 0);
  assert.strictEqual(ghost.costUsd, 0.006);
});

test('cache_read tokens are priced into cost but not folded into the token headline', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-cacheread-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  // A cache-heavy run: modest input/output, large cache_read. Cost must reflect
  // the cache reads (not $0.00), while the token headline stays input+output.
  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(0), agent: 'cacher', durationMs: 1000, inputTokens: 100, outputTokens: 50, cacheReadTokens: 100000, tokensAvailable: true },
  ]);

  var analytics = parsePayload(runGenerator(home).stdout).analytics;
  var cacher = analytics.topAgents.find(function(agent) { return agent.name === 'cacher'; });

  // tokens headline = 100 + 50 (cache_read excluded)
  assert.strictEqual(cacher.tokens, 150);
  // cost = (100*3 + 100000*0.3 + 50*15) / 1e6 = (300 + 30000 + 750)/1e6 = 0.03105
  assert.strictEqual(cacher.costUsd, 0.0311);
  assert.ok(cacher.costUsd > 0, 'cache-heavy run must not price to $0');
});

// ---------------------------------------------------------------------------
// v7.3.0, W2+/codex 7 — Cockpit builder relocation. The real builder now
// lives at commander/cowork-plugin/scripts/build-cockpit.mjs; the repo-root
// scripts/build-cockpit.mjs is a thin spawn shim.
// ---------------------------------------------------------------------------

test('shim (scripts/build-cockpit.mjs) and the canonical in-plugin builder produce equivalent output', function() {
  var shimResult = cp.spawnSync(process.execPath, [SHIM_GENERATOR_PATH], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
  });
  assert.strictEqual(shimResult.status, 0, shimResult.stderr);
  var shimPayload = parsePayload(shimResult.stdout);

  // `payload` (module-level) is the direct-location run from the top of this
  // file. generatedAt/dataThroughMs are real-clock-dependent — compare
  // everything else.
  assert.strictEqual(shimPayload.meta.version, payload.meta.version);
  assert.strictEqual(shimPayload.meta.pluginSkills, payload.meta.pluginSkills);
  assert.strictEqual(shimPayload.meta.ecosystemSkills, payload.meta.ecosystemSkills);
  assert.strictEqual(shimPayload.meta.agents, payload.meta.agents);
  assert.strictEqual(shimPayload.meta.pluginOnly, payload.meta.pluginOnly);
  assert.deepStrictEqual(shimPayload.skills, payload.skills);
  assert.deepStrictEqual(shimPayload.agents, payload.agents);
  assert.deepStrictEqual(shimPayload.ideas, payload.ideas);
  assert.deepStrictEqual(shimPayload.tools, payload.tools);
  assert.deepStrictEqual(shimPayload.patterns, payload.patterns);
  assert.deepStrictEqual(shimPayload.prompts, payload.prompts);
});

test('plugin-only install (no commander/contract.json, no top-level ecosystem skills/) still builds — honest smaller Cockpit, never crashes', function(t) {
  var pluginOnlyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-plugin-only-'));
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-plugin-only-home-'));
  t.after(function() {
    fs.rmSync(pluginOnlyRoot, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });
  // Copy ONLY the cowork-plugin/ subtree — mirrors exactly what a
  // marketplace install ships (agents/hooks/lib/menus/rules/skills/scripts,
  // per .claude-plugin/plugin.json). No commander/contract.json, no
  // top-level skills/ ecosystem catalog anywhere on this tmp filesystem.
  fs.cpSync(path.join(ROOT, 'commander', 'cowork-plugin'), path.join(pluginOnlyRoot, 'cowork-plugin'), { recursive: true });

  var scriptPath = path.join(pluginOnlyRoot, 'cowork-plugin', 'scripts', 'build-cockpit.mjs');
  var result = cp.spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
    env: Object.assign({}, process.env, { HOME: home }),
  });
  assert.strictEqual(result.status, 0, result.stderr);

  var pluginOnlyPayload = parsePayload(result.stdout);
  assert.strictEqual(pluginOnlyPayload.meta.pluginOnly, true);
  assert.strictEqual(pluginOnlyPayload.meta.ecosystemSkills, 0);
  assert.strictEqual(
    pluginOnlyPayload.meta.pluginSkills,
    payload.meta.pluginSkills,
    'plugin skill count is unaffected by the relocation — same 80 skills ship either way'
  );
  assert.strictEqual(pluginOnlyPayload.meta.version, payload.meta.version, 'version falls back to plugin.json when contract.json is absent');
  assert.strictEqual(pluginOnlyPayload.skills.filter(function(s) { return s.source === 'ecosystem'; }).length, 0);
  assert.ok(pluginOnlyPayload.ideas.length > 0, 'at least some ideas resolve against plugin-only skills');
  assert.ok(pluginOnlyPayload.ideas.length < payload.ideas.length, 'fewer ideas resolve without the ecosystem catalog to fall back on');
  // Prompts tab data ships INSIDE cowork-plugin/lib/prompts-data/ — unlike
  // contract.json/ecosystem skills, a plugin-only install carries it in full.
  assert.deepStrictEqual(pluginOnlyPayload.prompts, payload.prompts);
  assert.doesNotThrow(function() { assertSelfContainedFromOutput(result.stdout); });
});

function assertSelfContainedFromOutput(output) {
  if (/\b(?:src|href)\s*=\s*["']?\s*https?:\/\//i.test(output)) throw new Error('external src/href leaked');
  if (/<script\b[^>]*\bsrc\s*=/i.test(output)) throw new Error('<script src> leaked');
}

// ---------------------------------------------------------------------------
// v7.3.0, Item 6 — telemetry freshness on the Cockpit's meta payload.
// ---------------------------------------------------------------------------

test('meta.dataThroughMs/hasAnySourceRow/telemetryStale reflect the newest local telemetry row', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-freshness-stale-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(10), agent: 'ghost', durationMs: 500, inputTokens: 100, outputTokens: 20 },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var meta = parsePayload(result.stdout).meta;
  assert.strictEqual(meta.hasAnySourceRow, true);
  assert.strictEqual(meta.telemetryStale, true);
  assert.ok(Number.isFinite(meta.dataThroughMs));
});

test('meta.telemetryStale is false when there is no telemetry at all', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-freshness-empty-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var meta = parsePayload(result.stdout).meta;
  assert.strictEqual(meta.hasAnySourceRow, false);
  assert.strictEqual(meta.telemetryStale, false);
  assert.strictEqual(meta.dataThroughMs, null);
});

test('meta.telemetryStale is false when the newest row is within 24h', function(t) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-freshness-fresh-'));
  t.after(function() { fs.rmSync(home, { recursive: true, force: true }); });
  writeJsonl(home, 'agent-runs.jsonl', [
    { ts: ago(0, 5), agent: 'ghost', durationMs: 500, inputTokens: 100, outputTokens: 20 },
  ]);

  var result = runGenerator(home);
  assert.strictEqual(result.status, 0, result.stderr);
  var meta = parsePayload(result.stdout).meta;
  assert.strictEqual(meta.hasAnySourceRow, true);
  assert.strictEqual(meta.telemetryStale, false);
});

// ---------------------------------------------------------------------------
// v7.3.0, W5/Item 15 — Prompts tab. 4 vendored JSON sources under
// commander/cowork-plugin/lib/prompts-data/ are normalized by
// buildPrompts() into payload.prompts.entries, a single flat shape the
// template renders generically ({id, source, kind, title, desc, category,
// sdlc, roles, prompt}). readyiq.json is TEASER TIER ONLY (Kevin, 2026-07-22):
// names + one-line descriptions, never a prompt/systemPrompt body.
// ---------------------------------------------------------------------------

function readPromptsDataFixture(filename) {
  return JSON.parse(fs.readFileSync(path.join(PROMPTS_DATA_DIR, filename), 'utf8'));
}

test('prompts tab is wired into the nav and section markup', function() {
  assert.ok(output.includes('data-tab="prompts"'), 'prompts nav button');
  assert.ok(output.includes('id="tab-prompts"'), 'prompts section');
  assert.match(output, /var TABS = \[[^\]]*'prompts'[^\]]*\]/, "TABS array includes 'prompts'");
});

test('prompts tab carries its search/filter DOM hooks', function() {
  ['id="pq"', 'id="prompt-source-filter"', 'id="prompt-phase-filter"', 'id="prompt-category-filter"', 'id="prompt-attribution"', 'id="prompt-results"'].forEach(function(needle) {
    assert.ok(output.includes(needle), 'expected ' + needle + ' in built output');
  });
});

test('all 4 prompt sources render with non-zero counts in the payload', function() {
  var anthropic = readPromptsDataFixture('anthropic.json');
  var cccLibrary = readPromptsDataFixture('ccc-library.json');
  var templates = readPromptsDataFixture('templates.json');
  var readyiq = readPromptsDataFixture('readyiq.json');
  var expectedCccLibraryCount = cccLibrary.prompts.length + cccLibrary.patterns.length + cccLibrary.modules.length;

  var entries = payload.prompts.entries;
  var bySource = {};
  entries.forEach(function(e) { bySource[e.source] = (bySource[e.source] || 0) + 1; });

  assert.strictEqual(bySource.anthropic, anthropic.entries.length);
  assert.strictEqual(bySource['ccc-library'], expectedCccLibraryCount);
  assert.strictEqual(bySource.templates, templates.entries.length);
  assert.strictEqual(bySource.readyiq, readyiq.entries.length);
  assert.ok(bySource.readyiq >= 1, 'readyiq teaser must contribute at least 1 entry');
  assert.strictEqual(entries.length, anthropic.entries.length + expectedCccLibraryCount + templates.entries.length + readyiq.entries.length);
  // Regression pin — matches the committed vendored data as of this change.
  assert.deepStrictEqual(bySource, { anthropic: 52, 'ccc-library': 65, templates: 36, readyiq: 14 });
});

test('every prompt entry has the documented normalized shape', function() {
  payload.prompts.entries.forEach(function(e) {
    assert.strictEqual(typeof e.id, 'string');
    assert.ok(['anthropic', 'ccc-library', 'templates', 'readyiq'].indexOf(e.source) !== -1, e.id + ' source');
    assert.ok(['prompt', 'pattern', 'module', 'template', 'agent'].indexOf(e.kind) !== -1, e.id + ' kind');
    assert.strictEqual(typeof e.title, 'string');
    assert.strictEqual(typeof e.desc, 'string');
    assert.strictEqual(typeof e.category, 'string');
    assert.strictEqual(typeof e.sdlc, 'string');
    assert.ok(Array.isArray(e.roles), e.id + ' roles');
    assert.strictEqual(typeof e.prompt, 'string');
  });
});

test('readyiq is teaser tier — no prompt bodies anywhere, and a funnel card is present', function() {
  var readyiqEntries = payload.prompts.entries.filter(function(e) { return e.source === 'readyiq'; });
  assert.ok(readyiqEntries.length >= 1);
  readyiqEntries.forEach(function(e) {
    assert.strictEqual(e.prompt, '', e.id + ' must carry no prompt body (teaser tier)');
    assert.strictEqual(e.kind, 'agent');
  });

  var funnel = payload.prompts.readyiqFunnel;
  assert.ok(funnel && typeof funnel === 'object', 'readyiqFunnel present');
  assert.ok(funnel.title && funnel.desc && funnel.cta, 'funnel has title/desc/cta');
  assert.ok(output.includes('Build agents like these with ReadyIQ'), 'funnel card copy present in built output');

  // Structural guard directly on the source fixture: only name/category/
  // avatar/desc fields are allowed — no systemPrompt, keywords, capabilities,
  // or model leaking the proprietary ReadyIQ agent framework into the MIT repo.
  var readyiqFixture = readPromptsDataFixture('readyiq.json');
  var allowedKeys = ['id', 'name', 'category', 'avatar', 'desc'];
  readyiqFixture.entries.forEach(function(entry) {
    var keys = Object.keys(entry);
    keys.forEach(function(key) {
      assert.ok(allowedKeys.indexOf(key) !== -1, 'readyiq.json entry ' + entry.id + ' has disallowed key: ' + key);
    });
    assert.strictEqual(entry.hasOwnProperty('prompt'), false, entry.id + ' must not carry a prompt field');
    assert.strictEqual(entry.hasOwnProperty('systemPrompt'), false, entry.id + ' must not carry a systemPrompt field');
  });
});

test('prompt attribution is rendered as plain text with no external href', function() {
  assert.ok(output.includes('Prompt library from code.claude.com/docs'), 'anthropic attribution text present');
  assert.ok(output.includes('© Anthropic'), 'anthropic attribution copyright present');
  assert.ok(output.includes('readyiq.ai'), 'readyiq domain present as plain text');
  // readyiq.ai must never appear inside a live href/src — it's copy inside
  // the JSON payload + rendered as plain text, per Kevin's no-hyperlink rule.
  assert.doesNotMatch(output, /href\s*=\s*["']?[^"'>]*readyiq\.ai/i);
  assert.doesNotMatch(output, /src\s*=\s*["']?[^"'>]*readyiq\.ai/i);
});

test('prompts tab wires copy + enhance actions and a source/phase/category filter chip pattern', function() {
  assert.ok(output.includes('data-enhance'), 'enhance action wiring present');
  assert.ok(output.includes("activateTab('enhance')"), 'enhance action switches to the Enhance tab');
  assert.ok(output.includes('data-ps='), 'source filter chips present');
  assert.ok(output.includes('data-pp='), 'phase filter chips present');
  assert.ok(output.includes('data-pc='), 'category filter chips present');
});

test('prompts payload data-copy strings for a malicious prompt body are escaped against script-breakout, and round-trip losslessly', function(t) {
  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-prompts-xss-'));
  t.after(function() { fs.rmSync(tmpRoot, { recursive: true, force: true }); });
  fs.cpSync(COWORK_PLUGIN_DIR, path.join(tmpRoot, 'cowork-plugin'), { recursive: true });

  var payloadStr = '</script><img src=x onerror=alert(1)>';
  var anthropicPath = path.join(tmpRoot, 'cowork-plugin', 'lib', 'prompts-data', 'anthropic.json');
  var fixture = JSON.parse(fs.readFileSync(anthropicPath, 'utf8'));
  fixture.entries[0].prompt = payloadStr;
  fixture.entries[0].title = payloadStr;
  fs.writeFileSync(anthropicPath, JSON.stringify(fixture));

  var scriptPath = path.join(tmpRoot, 'cowork-plugin', 'scripts', 'build-cockpit.mjs');
  var result = cp.spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  assert.strictEqual(result.status, 0, result.stderr);

  assert.ok(!result.stdout.includes(payloadStr), 'raw unescaped </script> breakout must not appear in the built output');
  assert.ok(result.stdout.includes('<\\/script><img src=x onerror=alert(1)>'), 'malicious string should survive JSON-encoded with </script escaped');

  var tmpPayload = parsePayload(result.stdout);
  var maliciousEntry = tmpPayload.prompts.entries.find(function(e) { return e.id === 'anthropic:' + fixture.entries[0].id; });
  assert.ok(maliciousEntry, 'malicious entry present in normalized payload');
  assert.strictEqual(maliciousEntry.prompt, payloadStr);
  assert.strictEqual(maliciousEntry.title, payloadStr);
  assert.doesNotThrow(function() { assertSelfContainedFromOutput(result.stdout); });
});

test('prompts tab degrades to 0 entries for a source (never a crash) when its JSON file is absent', function(t) {
  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-prompts-missing-'));
  t.after(function() { fs.rmSync(tmpRoot, { recursive: true, force: true }); });
  fs.cpSync(COWORK_PLUGIN_DIR, path.join(tmpRoot, 'cowork-plugin'), { recursive: true });
  fs.rmSync(path.join(tmpRoot, 'cowork-plugin', 'lib', 'prompts-data', 'readyiq.json'));

  var scriptPath = path.join(tmpRoot, 'cowork-plugin', 'scripts', 'build-cockpit.mjs');
  var result = cp.spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  assert.strictEqual(result.status, 0, result.stderr);

  var tmpPayload = parsePayload(result.stdout);
  var bySource = {};
  tmpPayload.prompts.entries.forEach(function(e) { bySource[e.source] = (bySource[e.source] || 0) + 1; });
  assert.strictEqual(bySource.readyiq, undefined, 'readyiq contributes 0 entries when its JSON is missing');
  assert.ok(bySource.anthropic > 0, 'other sources are unaffected by one missing file');
  assert.strictEqual(tmpPayload.prompts.readyiqFunnel, null);
  assert.doesNotThrow(function() { assertSelfContainedFromOutput(result.stdout); });
});
