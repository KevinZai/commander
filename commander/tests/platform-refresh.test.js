// 8.2 platform refresh: deferred MCP loading, userConfig with env fallback, ${CLAUDE_PLUGIN_DATA} for
// hook-private state (read fallback to the lane dir), the fleet-watch monitor, and their Codex translation.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const CODEX = path.join(__dirname, '..', 'cowork-plugin-codex');
const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
const options = require('../cowork-plugin/lib/plugin-options.js');
const laneState = require('../cowork-plugin/lib/lane-state.js');
const network = require('../cowork-plugin/lib/network-mode.js');

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-82-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('every bundled MCP server is deferred behind tool search; the Codex mirror drops the key', () => {
  const mcp = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.mcp.json'), 'utf8'));
  assert.ok(Object.keys(mcp.mcpServers).length > 0);
  for (const [name, s] of Object.entries(mcp.mcpServers)) assert.equal(s.alwaysLoad, false, name);
  const codex = JSON.parse(fs.readFileSync(path.join(CODEX, '.mcp.json'), 'utf8'));
  assert.deepEqual(Object.keys(codex.mcpServers), Object.keys(mcp.mcpServers));
  for (const [name, s] of Object.entries(codex.mcpServers)) assert.ok(!('alwaysLoad' in s), name);
});

test('userConfig: strict fields only, secrets sensitive, every key has a legacy env fallback', () => {
  const uc = manifest.userConfig;
  const allowed = new Set(['type', 'title', 'description', 'required', 'default', 'options', 'multiple', 'sensitive', 'min', 'max']);
  for (const [key, field] of Object.entries(uc)) {
    assert.match(key, /^[A-Za-z_][A-Za-z0-9_]*$/);
    for (const k of Object.keys(field)) assert.ok(allowed.has(k), `${key}.${k}`);
    assert.ok(['string', 'number', 'boolean', 'directory', 'file'].includes(field.type), key);
    assert.ok(field.title && field.description, key);
    // A default would be exported on every run and shadow nothing, but would hide "unset"; keep none.
    assert.ok(!('default' in field), `${key} has no default`);
    assert.ok(options.LEGACY_ENV[key], `${key} has a legacy env fallback`);
  }
  assert.equal(uc.mcp_token.sensitive, true);
  for (const key of Object.keys(uc)) if (/token|secret|key/i.test(key)) assert.equal(uc[key].sensitive, true, key);
});

test('plugin options: the legacy variable wins, the option fills in when it is unset', () => {
  assert.equal(options.optionEnvName('cost_ceiling'), 'CLAUDE_PLUGIN_OPTION_COST_CEILING');
  assert.equal(options.setting('cost_ceiling', { CLAUDE_PLUGIN_OPTION_COST_CEILING: '5' }), '5');
  assert.equal(options.settingSource('cost_ceiling', { CLAUDE_PLUGIN_OPTION_COST_CEILING: '5' }), 'userConfig');
  assert.equal(options.setting('cost_ceiling', { CCC_COST_CEILING: '2', CLAUDE_PLUGIN_OPTION_COST_CEILING: '5' }), '2');
  assert.equal(options.setting('mcp_token', { COMMANDER_TOKEN: 'a', CLAUDE_PLUGIN_OPTION_MCP_TOKEN: 'b' }), 'a');
  assert.equal(options.setting('mcp_token', { CLAUDE_PLUGIN_OPTION_MCP_TOKEN: 'b' }), 'b');
  assert.equal(options.setting('mcp_token', { CLAUDE_PLUGIN_OPTION_MCP_TOKEN: '  ' }), undefined);
});

test('offline/telemetry options: either source turning offline on or telemetry off wins', (t) => {
  const homeDir = tmp(t);
  const o = { homeDir };
  assert.equal(network.isOffline({ CLAUDE_PLUGIN_OPTION_OFFLINE: 'true' }, o), true);
  assert.equal(network.isOffline({ CCC_OFFLINE: '0', CLAUDE_PLUGIN_OPTION_OFFLINE: 'true' }, o), true);
  assert.equal(network.isTelemetryEnabled({ CLAUDE_PLUGIN_OPTION_TELEMETRY: 'true' }, o), true);
  assert.equal(network.isTelemetryEnabled({ CCC_TELEMETRY: '0', CLAUDE_PLUGIN_OPTION_TELEMETRY: 'true' }, o), false);
  assert.equal(network.isTelemetryEnabled({ CCC_TELEMETRY: '1', CLAUDE_PLUGIN_OPTION_TELEMETRY: 'false' }, o), false);
  assert.equal(network.isTelemetryEnabled({ CLAUDE_PLUGIN_OPTION_TELEMETRY: 'true', CLAUDE_PLUGIN_OPTION_OFFLINE: 'true' }, o), false);
  assert.equal(network.isTelemetryEnabled({}, o), false);
});

test('cost ceiling from the userConfig option is enforced like CCC_COST_CEILING', (t) => {
  const home = tmp(t);
  const sessions = path.join(home, '.claude', 'commander', 'sessions');
  fs.mkdirSync(sessions, { recursive: true });
  fs.writeFileSync(path.join(sessions, 'active-cost-opt.json'), JSON.stringify({ estimatedCost: 9, warned: true, ceilingWarned: true }));
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'cost-ceiling-enforcer.js')], {
    input: JSON.stringify({ session_id: 'opt', tool_name: 'Read', tool_input: {} }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CCC_TELEMETRY: '0', CLAUDE_PLUGIN_OPTION_COST_CEILING: '1' },
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  assert.ok(out.systemMessage || out.hookSpecificOutput, `the option set a ceiling: ${r.stdout}`);
});

test('hook-private state: CLAUDE_PLUGIN_DATA when set, read fallback to the lane copy, nothing moved', (t) => {
  const home = tmp(t);
  const data = path.join(home, 'plugins', 'data', 'commander');
  const env = { HOME: home, CLAUDE_PLUGIN_DATA: data };
  assert.equal(laneState.pluginDataDir({ HOME: home }), '');
  assert.equal(laneState.hookDataDir({ HOME: home }), laneState.stateDir({ HOME: home }));
  assert.equal(laneState.hookDataDir(env), data);
  assert.equal(laneState.pluginDataDir({ HOME: home, PLUGIN_DATA: data }), data, 'Codex PLUGIN_DATA');

  const lane = path.join(home, '.claude', 'commander', 'fable-nudge-2026-11-18');
  assert.equal(laneState.readableHookDataPath('fable-nudge-2026-11-18', env), path.join(data, 'fable-nudge-2026-11-18'));
  fs.mkdirSync(path.dirname(lane), { recursive: true });
  fs.writeFileSync(lane, '');
  assert.equal(laneState.readableHookDataPath('fable-nudge-2026-11-18', env), lane, 'earlier lane copy is read');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'fable-nudge-2026-11-18'), '');
  assert.equal(laneState.readableHookDataPath('fable-nudge-2026-11-18', env), path.join(data, 'fable-nudge-2026-11-18'));
  assert.ok(fs.existsSync(lane), 'the lane copy is left in place');
});

test('stale-claude-md-nudge writes its marker under CLAUDE_PLUGIN_DATA and honours an earlier lane marker', (t) => {
  const home = tmp(t);
  const data = path.join(home, 'plugin-data');
  const repo = path.join(home, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'package.json'), '{}');
  const run = () => spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'stale-claude-md-nudge.js')], {
    input: JSON.stringify({ hook_event_name: 'InstructionsLoaded', cwd: repo, session_id: 's' }),
    encoding: 'utf8',
    cwd: repo,
    env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CLAUDE_PLUGIN_DATA: data, CCC_TELEMETRY: '0' },
  });
  const laneDir = path.join(home, '.claude', 'commander');
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /No CLAUDE\.md/);
  const markers = fs.readdirSync(data).filter((f) => f.startsWith('claudemd-nudge-'));
  assert.equal(markers.length, 1, 'marker written under CLAUDE_PLUGIN_DATA');
  assert.ok(!fs.existsSync(laneDir) || !fs.readdirSync(laneDir).some((f) => f.startsWith('claudemd-nudge-')), 'nothing new in the lane dir');
  assert.doesNotMatch(run().stdout, /No CLAUDE\.md/, 'once per day');

  // An upgrade: the marker an earlier release wrote to the lane dir still counts.
  fs.rmSync(data, { recursive: true, force: true });
  fs.mkdirSync(laneDir, { recursive: true });
  fs.writeFileSync(path.join(laneDir, markers[0]), '');
  assert.doesNotMatch(run().stdout, /No CLAUDE\.md/, 'lane marker honoured');
});

test('fleet-watch monitor: declared in the manifest, Claude-only, prints status changes once', async () => {
  assert.equal(manifest.experimental.monitors, './monitors/monitors.json');
  const monitors = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'monitors', 'monitors.json'), 'utf8'));
  const allowed = new Set(['name', 'command', 'description', 'when']);
  for (const m of monitors) {
    for (const k of Object.keys(m)) assert.ok(allowed.has(k), k);
    assert.match(m.command, /"\$\{CLAUDE_PLUGIN_ROOT\}\/monitors\//);
    assert.doesNotMatch(m.command, /user_config/);
  }
  assert.ok(!fs.existsSync(path.join(CODEX, 'monitors')), 'Codex has no monitors');

  const { diffFleet } = await import(pathToFileURL(path.join(PLUGIN, 'monitors', 'fleet-watch.mjs')).href);
  const s1 = { summary: { total: 2 }, workers: [{ id: 'w1', status: 'running' }, { id: 'w2', status: 'running' }] };
  const first = diffFleet(new Map(), s1);
  assert.equal(first.lines.length, 2);
  assert.deepEqual(diffFleet(first.statuses, s1).lines, [], 'no change, no line');
  const s2 = { summary: { total: 2, done: 1, failed: 1 }, workers: [{ id: 'w1', status: 'done' }, { id: 'w2', status: 'failed', error: 'conflict' }] };
  const second = diffFleet(first.statuses, s2);
  assert.deepEqual(second.lines, [
    '[ccc-fleet] w1: running -> done',
    '[ccc-fleet] w2: running -> failed: conflict',
    '[ccc-fleet] run settled: 1 done, 1 failed of 2. Run /ccc-fleet-viz for the tree.',
  ]);
});

test('context budget: recorded, and the current plugin fits it', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'scripts', 'context-budget.js'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
