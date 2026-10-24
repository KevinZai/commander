'use strict';
// CC-2098: plugin hooks keep per-lane state through lib/lane-state.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const laneState = require('../cowork-plugin/lib/lane-state.js');
const lane = require('../lib/lane.js');
const diagnostics = require('../cowork-plugin/skills/ccc-doctor/lib/diagnostics.js');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');

function tmpHome(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-lane-state-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('lane-state resolves the same dirs as commander/lib/lane.js', (t) => {
  const home = tmpHome(t);
  const envs = [
    { HOME: home },
    { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') },
    { HOME: home, CCC_CONFIG_DIR: path.join(home, '.claude-ai2') },
    { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1'), CCC_CONFIG_DIR: path.join(home, '.claude-ai3') },
    { HOME: home, CLAUDE_CONFIG_DIR: 'relative/.claude-x' },
    { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'custom') },
  ];
  for (const env of envs) {
    assert.equal(laneState.stateDir(env), lane.resolveLane(env).stateDir, JSON.stringify(env));
    assert.equal(laneState.configDir(env), lane.resolveLane(env).configDir, JSON.stringify(env));
    assert.equal(laneState.legacyStateDir(env), lane.legacyStateDir(env));
  }
});

test('readablePath prefers the lane copy, falls back to legacy only on ENOENT', (t) => {
  const home = tmpHome(t);
  const env = { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') };
  const own = path.join(home, '.claude-ai1', 'commander', 'config.json');
  const legacy = path.join(home, '.claude', 'commander', 'config.json');

  assert.equal(laneState.readablePath('config.json', env), own, 'fresh lane: lane path');
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  fs.writeFileSync(legacy, '{}');
  assert.equal(laneState.readablePath('config.json', env), legacy, 'lane copy absent: legacy');
  assert.equal(laneState.readableStateDir(env), path.dirname(legacy));
  fs.mkdirSync(path.dirname(own), { recursive: true });
  fs.writeFileSync(own, '{}');
  assert.equal(laneState.readablePath('config.json', env), own, 'lane copy wins');
  assert.equal(laneState.readableStateDir(env), path.dirname(own));
});

test('readablePath fails closed: a non-ENOENT error keeps the lane path', (t) => {
  const home = tmpHome(t);
  const env = { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') };
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'fleet-hold.json'), '{"hold":false}');
  // <lane>/commander is a file, so stat of <lane>/commander/fleet-hold.json is ENOTDIR.
  fs.mkdirSync(path.join(home, '.claude-ai1'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude-ai1', 'commander'), 'not a dir');
  assert.equal(
    laneState.readablePath('fleet-hold.json', env),
    path.join(home, '.claude-ai1', 'commander', 'fleet-hold.json'),
  );
});

test('no live hook builds the shared ~/.claude/commander path', () => {
  assert.deepEqual(diagnostics.findSharedStateWriters(HOOKS_DIR), []);
});

test('the shared-state scan catches literal writers and ignores comments', (t) => {
  const dir = tmpHome(t);
  fs.mkdirSync(path.join(dir, 'lib'));
  fs.writeFileSync(path.join(dir, 'a.js'), "const D = join(HOME, '.claude', 'commander');\n");
  fs.writeFileSync(path.join(dir, 'b.js'), "const D = join(\n  HOME,\n  '.claude',\n  'commander'\n);\n");
  fs.writeFileSync(path.join(dir, 'c.js'), 'const D = `${HOME}/.claude/commander/x.json`;\n');
  fs.writeFileSync(path.join(dir, 'ok.js'), "// writes ~/.claude/commander/x.json\nconst D = stateDir(); const m = 'see ~/.claude/commander/console.json';\n");
  fs.writeFileSync(path.join(dir, 'lib', 'd.mjs'), "export const D = path.join(h, '.claude', 'commander');\n");
  assert.deepEqual(diagnostics.findSharedStateWriters(dir), ['a.js', 'b.js', 'c.js', 'lib/d.mjs']);
});

test('the orchestrator handler list includes its _archive and dual-mode handlers', () => {
  const handlers = diagnostics.orchestratorHandlers(HOOKS_DIR);
  assert.ok(handlers.includes('_archive/session-start.js'));
  assert.ok(handlers.includes('fable-armed-nudge.js'));
  assert.ok(handlers.includes('voice-injector.js'));
});

function runHook(file, env, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(HOOKS_DIR, file)], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out }));
    child.stdin.end(JSON.stringify(payload));
  });
}

function readRows(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
}

test('two lanes run hooks concurrently and keep separate state files', async (t) => {
  const home = tmpHome(t);
  const lanes = ['ai1', 'ai2'];
  const base = { PATH: process.env.PATH, HOME: home };
  const runs = [];
  for (const name of lanes) {
    const env = { ...base, CLAUDE_CONFIG_DIR: path.join(home, '.claude-' + name) };
    for (let i = 0; i < 4; i++) {
      runs.push(runHook('post-tool-failure-logger.js', env, { tool_name: 'Bash', error: name + '-' + i }));
      runs.push(runHook('stop-failure-handler.js', env, { error_type: 'x', message: name + '-' + i }));
    }
  }
  const results = await Promise.all(runs);
  for (const r of results) assert.equal(r.code, 0);

  for (const name of lanes) {
    const dir = path.join(home, '.claude-' + name, 'commander');
    const failures = readRows(path.join(dir, 'tool-failures.jsonl')).map((r) => r.error).sort();
    const stops = readRows(path.join(dir, 'stop-failures.jsonl')).map((r) => r.message).sort();
    const expected = [0, 1, 2, 3].map((i) => name + '-' + i);
    assert.deepEqual(failures, expected, name + ' tool-failures holds only its own rows');
    assert.deepEqual(stops, expected, name + ' stop-failures holds only its own rows');
  }
  assert.equal(fs.existsSync(path.join(home, '.claude', 'commander')), false, 'nothing written to the shared dir');
});

test('without a lane env the hooks keep writing ~/.claude/commander', async (t) => {
  const home = tmpHome(t);
  const r = await runHook('post-tool-failure-logger.js', { PATH: process.env.PATH, HOME: home }, { tool_name: 'Bash', error: 'pri' });
  assert.equal(r.code, 0);
  assert.deepEqual(readRows(path.join(home, '.claude', 'commander', 'tool-failures.jsonl')).map((x) => x.error), ['pri']);
});

test('lib writers append to the lane dir even while reads fall back to legacy', async (t) => {
  const home = tmpHome(t);
  const legacy = path.join(home, '.claude', 'commander');
  fs.mkdirSync(path.join(legacy, 'mission-control'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'mission-control', 'suggestions.jsonl'), '');
  const saved = { HOME: process.env.HOME, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR };
  process.env.HOME = home;
  process.env.CLAUDE_CONFIG_DIR = path.join(home, '.claude-ai1');
  t.after(() => {
    process.env.HOME = saved.HOME;
    if (saved.CLAUDE_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = saved.CLAUDE_CONFIG_DIR;
  });
  const suggestions = await import('../cowork-plugin/lib/suggestions.js');
  const metrics = await import('../cowork-plugin/lib/metrics.js');
  assert.equal(await suggestions.appendSuggestion({ id: 's1', text: 'x' }), true);
  assert.equal(await metrics.appendMetrics([{ date: '2026-10-24', source_app: 'claude-code' }]), true);
  const lane = path.join(home, '.claude-ai1', 'commander', 'mission-control');
  assert.ok(fs.existsSync(path.join(lane, 'suggestions.jsonl')), 'suggestion written to the lane');
  assert.ok(fs.existsSync(path.join(lane, 'metrics.jsonl')), 'metrics written to the lane');
  assert.equal(fs.readFileSync(path.join(legacy, 'mission-control', 'suggestions.jsonl'), 'utf8'), '', 'legacy log untouched');
});

test('readUsageModel recomputes metrics into the lane while reading the legacy fallback', async (t) => {
  const home = tmpHome(t);
  const legacy = path.join(home, '.claude', 'commander');
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, 'skill-runs.jsonl'), '');
  const saved = { HOME: process.env.HOME, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR };
  process.env.HOME = home;
  process.env.CLAUDE_CONFIG_DIR = path.join(home, '.claude-ai1');
  t.after(() => {
    process.env.HOME = saved.HOME;
    if (saved.CLAUDE_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = saved.CLAUDE_CONFIG_DIR;
  });
  const usage = await import('../cowork-plugin/lib/usage-snapshot.js');
  await usage.readUsageModel({ metricsRunner: async () => '[]' });
  assert.ok(fs.existsSync(path.join(home, '.claude-ai1', 'commander', 'mission-control', 'metrics.jsonl')), 'metrics persisted to the lane');
  assert.equal(fs.existsSync(path.join(legacy, 'mission-control', 'metrics.jsonl')), false, 'legacy dir not written');
});
