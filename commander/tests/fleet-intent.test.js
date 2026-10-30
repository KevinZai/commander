'use strict';

// CC-2096: Fleet <-> CCC routing. Fleet control-plane prompts go to the Fleet
// skill with the ccc check-in line; CCC's own prompts (incl. /ccc-fleet) stay
// in CCC; nothing is ever launched. PATH, HOME and the config dir are temp
// fixtures with stub `fleet` / `ccc` binaries.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const HOOKS = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const HOOK = path.join(HOOKS, 'intent-classifier.js');
const LIB = path.join(HOOKS, 'lib', 'fleet-intent.mjs');

const ROUTES = [
  // prompt, expected Fleet intent id (null = stays in CCC)
  ['launch a lane for the dmhub batch', 'launch'],
  ['spin up a superfleet batch on ai3', 'launch'],
  ['which lane has the most headroom?', 'usage'],
  ['show me fleet usage limits', 'usage'],
  ['status of SF-CCC-20261024', 'batch-status'],
  ['SF-FIREPROOF-A progress', 'batch-status'],
  ['superfleet progress please', 'batch-status'],
  ['run a lane sweep', 'sweep'],
  ['are there any stale lanes', 'sweep'],
  ['finish the superfleet batch and post the final status', 'finish'],
  ["what's running on the fleet", 'status'],
  ['fleet status', 'status'],
  // ambiguous or CCC-local: stay in CCC
  ['run 3 agents in parallel to refactor the parser', null],
  ['launch a fleet of subagents in parallel', null],
  ['fan out the migration across worktrees', null],
  ['review my changes before I open the PR', null],
  ['what is running in this terminal', null],
  ['start a new project', null],
  ['show fleet progress tree for my parallel run', null],
  ['start a batch import of CSV files', null],
  ['finish the batch image conversion', null],
  ['show my AWS account usage', null],
  ['what is the batch status of the import job', null],
  ['Review this documentation snippet for accuracy:\n```\nfleet status\n```', null],
  ['is `fleet status` documented in the README?', null],
];

test('intent table: Fleet prompts map to Fleet intents, CCC prompts stay in CCC', async () => {
  const { matchFleetIntent } = await import(LIB);
  for (const [prompt, expected] of ROUTES) {
    const got = matchFleetIntent(prompt);
    assert.strictEqual(got ? got.id : null, expected, prompt);
  }
});

function fixture(t, { fleetCli = true, skill = false, ccc = 'ok' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc fleet route '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  const home = path.join(root, 'home');
  const cfg = path.join(home, '.claude-ai4');
  const marker = path.join(root, 'fleet-called');
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(cfg, { recursive: true });
  if (fleetCli) fs.writeFileSync(path.join(bin, 'fleet'), `#!/bin/sh\ntouch "${marker}"\n`, { mode: 0o755 });
  if (skill) {
    fs.mkdirSync(path.join(cfg, 'skills', 'claude-fleet'), { recursive: true });
    fs.writeFileSync(path.join(cfg, 'skills', 'claude-fleet', 'SKILL.md'), 'x');
  }
  if (ccc === 'ok') fs.writeFileSync(path.join(bin, 'ccc'), '#!/bin/sh\necho "CCC check-in OK: ccc 8.1.2, plugin 8.1.2, claude ?, lane ai4, 0 warnings"\n', { mode: 0o755 });
  if (ccc === 'old') fs.writeFileSync(path.join(bin, 'ccc'), '#!/bin/sh\necho "  What would you like to do?"\nexit 1\n', { mode: 0o755 });
  if (ccc === 'blocked') fs.writeFileSync(path.join(bin, 'ccc'), '#!/bin/sh\necho "CCC check-in BLOCKED: ccc 8.1.2, plugin missing, claude ?, lane ai4, no record"\nexit 3\n', { mode: 0o755 });
  return { root, bin, home, cfg, marker };
}

function run(f, prompt, env = {}) {
  const clean = { ...process.env };
  for (const k of ['CCC_ROUTE_MODE', 'CCC_FLEET_ROUTE', 'CCC_CONFIG_DIR', 'PLUGIN_ROOT']) delete clean[k];
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'test', prompt }),
    encoding: 'utf8',
    timeout: 10000,
    env: { ...clean, PATH: `${f.bin}${path.delimiter}/usr/bin${path.delimiter}/bin`, HOME: f.home, USERPROFILE: f.home, CLAUDE_CONFIG_DIR: f.cfg, CCC_TELEMETRY: '0', ...env },
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  return (out.hookSpecificOutput && out.hookSpecificOutput.additionalContext) || '';
}

test('Fleet intent with tools: Fleet skill + read-only commands + check-in line; nothing executed', (t) => {
  const f = fixture(t, { skill: true });
  const ctx = run(f, 'which lane has the most headroom?');
  assert.match(ctx, /^<ccc-fleet-route intent="usage">/);
  assert.match(ctx, /Use the claude-fleet skill\./);
  assert.match(ctx, /`fleet limits`, `fleet usage`/);
  assert.match(ctx, /CCC check-in: CCC check-in OK: .* lane ai4/);
  assert.match(ctx, /Do not launch, stop or message lanes/);
  assert.ok(!fs.existsSync(f.marker), 'the fleet CLI is never run');
});

test('launch intent carries the approval note and never launches', (t) => {
  const f = fixture(t);
  const ctx = run(f, 'launch a lane for the dmhub batch', { CCC_FLEET_ROUTE: 'on' });
  assert.match(ctx, /intent="launch"/);
  assert.match(ctx, /own approval flow/);
  assert.ok(!fs.existsSync(f.marker));
});

test('opt-in: off by default without the claude-fleet skill (a bare fleet binary is not enough)', (t) => {
  const f = fixture(t, { fleetCli: true, skill: false });
  assert.doesNotMatch(run(f, 'fleet status'), /ccc-fleet-route/);
  assert.match(run(f, 'fleet status', { CCC_FLEET_ROUTE: 'on' }), /ccc-fleet-route/);
});

test('suggest mode offers the Fleet skill instead of directing it', (t) => {
  const f = fixture(t, { skill: true });
  const ctx = run(f, 'fleet status', { CCC_ROUTE_MODE: 'suggest' });
  assert.match(ctx, /Offer the claude-fleet skill as an option and ask before using it\./);
  assert.doesNotMatch(ctx, /Use the claude-fleet skill/);
});

test('opted in with no Fleet tools: graceful one-line note, no commands, no check-in', (t) => {
  const f = fixture(t, { fleetCli: false, skill: false });
  const ctx = run(f, 'fleet status', { CCC_FLEET_ROUTE: 'on' });
  assert.match(ctx, /no Fleet tools .* are installed here/);
  assert.doesNotMatch(ctx, /Read-only commands/);
  assert.doesNotMatch(ctx, /CCC check-in:/);
});

test('a ccc without `checkin` (old checkout) adds no check-in line; a blocked one still reports', (t) => {
  const f = fixture(t, { ccc: 'old', skill: true });
  assert.doesNotMatch(run(f, 'fleet status'), /CCC check-in:/);
  const g = fixture(t, { ccc: 'blocked', skill: true });
  assert.match(run(g, 'fleet status'), /CCC check-in: CCC check-in BLOCKED: /);
});

test('CCC prompts keep normal CCC routing; CCC_FLEET_ROUTE=off and CCC_ROUTE_MODE=off disable Fleet routing', (t) => {
  const f = fixture(t, { skill: true });
  assert.doesNotMatch(run(f, 'run 3 agents in parallel to refactor the parser'), /ccc-fleet-route/);
  assert.doesNotMatch(run(f, 'fleet status', { CCC_FLEET_ROUTE: 'off' }), /ccc-fleet-route/);
  assert.strictEqual(run(f, 'fleet status', { CCC_ROUTE_MODE: 'off' }), '');
});

test('the claude-fleet skill is found in Codex skill dirs too (~/.agents/skills)', async () => {
  const { fleetTools } = await import(LIB);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc fleet codex '));
  try {
    const env = { HOME: home, PATH: '' };
    assert.strictEqual(fleetTools(env, home).skill, false);
    fs.mkdirSync(path.join(home, '.agents', 'skills', 'claude-fleet'), { recursive: true });
    fs.writeFileSync(path.join(home, '.agents', 'skills', 'claude-fleet', 'SKILL.md'), 'x');
    assert.strictEqual(fleetTools(env, home).skill, true);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
