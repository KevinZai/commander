'use strict';

// CC-2095: Superfleet segment in the status line ("🚀 ai4 SF-CCC 3/7 CC-2093 5h:6% 7d:21%").
// CC-2122: the 7-day window and the ~/.commander/lane-usage.json default.
// Fixtures live in temp dirs (with spaces); the status line runs from a copy of
// lib/ so no real run dir, usage file or config dir is read.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const LIB = path.join(__dirname, '..', 'lib');
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;
const SESSION = '11111111-2222-3333-4444-555555555555';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc sf segment '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const toolkit = path.join(root, 'toolkit');
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  for (const f of ['statusline.sh', 'statusline-superfleet.sh']) fs.copyFileSync(path.join(LIB, f), path.join(toolkit, 'lib', f));
  const home = path.join(root, 'home');
  const runs = path.join(root, 'runs root');
  const run = path.join(runs, 'ccc run');
  fs.mkdirSync(home);
  fs.mkdirSync(run, { recursive: true });
  fs.writeFileSync(path.join(run, 'SESSION_ID'), SESSION + '\n');
  fs.writeFileSync(path.join(run, 'BRIEF.md'), '# Brief\nBatch key: SF-CCC-20261024. Linear parent: CC-2092.\n');
  fs.writeFileSync(path.join(run, 'ITEMS.tsv'), [
    'item\tcommit\tstate\ttests\tcodex\tnote',
    'CC-2089\tabc\tdone\t-\t-\t-',
    'CC-2094\tdef\tdone\t-\t-\t-',
    'CC-2093\t-\twip\t-\t-\t-',
    'CC-2084\t-\ttodo\t-\t-\t-',
    'CC-2090\t-\tskipped\t-\t-\t-',
  ].join('\n') + '\n');
  const usage = path.join(root, 'lane usage.json');
  const cfg = path.join(home, '.claude-ai4');
  return { root, toolkit, home, runs, run, usage, cfg, tmp: fs.mkdtempSync(path.join(root, 'tmp-')) };
}

function writeUsage(f, fetchedAt, percent) {
  fs.writeFileSync(f.usage, JSON.stringify({ ai4: { fetchedAt, windows: [{ id: 'session', kind: 'session', percent }, { id: 'weekly:fable', percent: 21 }] } }));
}

function segment(f, env, input) {
  const fullEnv = { PATH: process.env.PATH, HOME: f.home, LC_ALL: 'C', TMPDIR: f.tmp, CLAUDE_CONFIG_DIR: f.cfg, ...env };
  for (const k of Object.keys(fullEnv)) if (fullEnv[k] === undefined) delete fullEnv[k];
  const started = process.hrtime.bigint();
  const r = spawnSync('bash', ['lib/statusline.sh'], {
    cwd: f.toolkit, env: fullEnv, encoding: 'utf8', timeout: 10_000,
    input: JSON.stringify(input || { session_id: SESSION, model: { display_name: 'Opus' }, workspace: { current_dir: f.root } }),
  });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.strictEqual(r.status, 0, r.stderr);
  const out = stripVTControlCharacters(r.stdout).trim();
  const m = /🚀 (.*)$/.exec(out);
  return { seg: m ? m[1] : null, out, ms };
}

test('no run dir: segment hidden', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  assert.strictEqual(segment(f, {}).seg, null);
  assert.strictEqual(segment(f, { SF_RUNS_ROOT: f.runs }, { session_id: 'other-session' }).seg, null);
  assert.strictEqual(segment(f, { SF_RUN_DIR: path.join(f.root, 'missing') }).seg, null);
});

test('SF_RUNS_ROOT + session id finds the run: lane, key, progress, current ticket, usage', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  writeUsage(f, new Date().toISOString(), 41.6);
  const { seg } = segment(f, { SF_RUNS_ROOT: f.runs, CCC_LANE_USAGE_FILE: f.usage });
  assert.strictEqual(seg, 'ai4 SF-CCC-20261024 3/5 CC-2093 5h:41% 7d:21%');
});

test('SF_RUN_DIR wins; without a wip row the first todo is current; no usage file means no usage', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.run, 'ITEMS.tsv'), 'item\tcommit\tstate\nA-1\tx\tdone\nA-2\t-\tblocked\nA-3\t-\ttodo\n');
  assert.strictEqual(segment(f, { SF_RUN_DIR: f.run }).seg, 'ai4 SF-CCC-20261024 1/3 A-3');
});

test('stale or missing usage shows 5h:? 7d:?', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  writeUsage(f, new Date(Date.now() - 31 * 60 * 1000).toISOString(), 10);
  assert.match(segment(f, { SF_RUN_DIR: f.run, CCC_LANE_USAGE_FILE: f.usage }).seg, / 5h:\? 7d:\?$/);
  const g = fixture(t);
  fs.writeFileSync(g.usage, JSON.stringify({ ai1: { fetchedAt: new Date().toISOString(), windows: [] } }));
  assert.match(segment(g, { SF_RUN_DIR: g.run, CCC_LANE_USAGE_FILE: g.usage }).seg, / 5h:\? 7d:\?$/);
  const h = fixture(t);
  assert.match(segment(h, { SF_RUN_DIR: h.run, CCC_LANE_USAGE_FILE: path.join(h.root, 'nope.json') }).seg, / 5h:\? 7d:\?$/);
  const m = fixture(t);
  fs.writeFileSync(m.usage, '{not json');
  assert.match(segment(m, { SF_RUN_DIR: m.run, CCC_LANE_USAGE_FILE: m.usage }).seg, / 5h:\? 7d:\?$/);
});

test('7d is the highest weekly window; a missing window alone shows ?', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  const fetchedAt = new Date().toISOString();
  fs.writeFileSync(f.usage, JSON.stringify({ ai4: { fetchedAt, windows: [
    { id: 'weekly', kind: 'weekly', percent: 12.9, resets_at: '2026-10-30T00:00:00Z' },
    { id: 'weekly:fable', kind: 'weekly_scoped', percent: 47.2, resetsAt: '2026-10-30T00:59:00Z' },
    { id: 'session', kind: 'session', percent: 3 },
  ] } }));
  assert.match(segment(f, { SF_RUN_DIR: f.run, CCC_LANE_USAGE_FILE: f.usage }).seg, / 5h:3% 7d:47%$/);
  const g = fixture(t);
  fs.writeFileSync(g.usage, JSON.stringify({ ai4: { fetchedAt, windows: [{ id: 'session', kind: 'session', percent: 8 }] } }));
  assert.match(segment(g, { SF_RUN_DIR: g.run, CCC_LANE_USAGE_FILE: g.usage }).seg, / 5h:8% 7d:\?$/);
});

test('CCC_LANE_USAGE_FILE unset: ~/.commander/lane-usage.json is read when it exists', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.home, '.commander'));
  f.usage = path.join(f.home, '.commander', 'lane-usage.json');
  writeUsage(f, new Date().toISOString(), 16);
  assert.strictEqual(segment(f, { SF_RUN_DIR: f.run }).seg, 'ai4 SF-CCC-20261024 3/5 CC-2093 5h:16% 7d:21%');
});

test('long batch keys are truncated to 16 characters; no BRIEF.md falls back to the dir name', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.run, 'BRIEF.md'), 'Batch key: SF-FIREPROOF-A-20261024-EXTRA\n');
  assert.strictEqual(segment(f, { SF_RUN_DIR: f.run }).seg.split(' ')[1], 'SF-FIREPROOF-A-…');
  const g = fixture(t);
  fs.rmSync(path.join(g.run, 'BRIEF.md'));
  assert.strictEqual(segment(g, { SF_RUN_DIR: g.run }).seg.split(' ').slice(1, 3).join(' '), 'ccc run');
});

test('CCC_STATUSLINE_SF=off hides it; guestnetworks shows lane ai5', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  assert.strictEqual(segment(f, { SF_RUN_DIR: f.run, CCC_STATUSLINE_SF: 'off' }).seg, null);
  assert.match(segment(f, { SF_RUN_DIR: f.run, CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-guestnetworks') }).seg, /^ai5 /);
});

test('CCC_CONFIG_DIR wins over CLAUDE_CONFIG_DIR, as in resolveLane()', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  assert.match(segment(f, { SF_RUN_DIR: f.run, CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-ai1'), CCC_CONFIG_DIR: path.join(f.home, '.claude-ai3') }).seg, /^ai3 /);
});

test('segment render time is bounded and cached', { skip: !HAS_JQ }, (t) => {
  const f = fixture(t);
  writeUsage(f, new Date().toISOString(), 5);
  const env = { SF_RUN_DIR: f.run, CCC_LANE_USAGE_FILE: f.usage };
  const base = segment(f, { SF_RUN_DIR: undefined }).ms;
  const cold = segment(f, env);
  const warm = segment(f, env);
  assert.strictEqual(warm.seg, cold.seg);
  // The segment's own cost (whole status line minus a run without it) stays small;
  // generous bound so loaded CI hosts do not flake.
  assert.ok(warm.ms - base < 250, `segment cost ${(warm.ms - base).toFixed(0)}ms`);
  const cacheDir = fs.readdirSync(f.tmp).filter((d) => d.startsWith('ccc-sf-'));
  assert.strictEqual(cacheDir.length, 1, 'cache lives under TMPDIR');
  // The cache line carries its own timestamp: fresh entries are reused, old ones re-rendered.
  const dir = path.join(f.tmp, cacheDir[0]);
  const file = path.join(dir, fs.readdirSync(dir)[0]);
  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(file, `${now} CACHED SEGMENT\n`);
  assert.strictEqual(segment(f, env).seg, 'CACHED SEGMENT');
  fs.writeFileSync(file, `${now - 60} CACHED SEGMENT\n`);
  assert.strictEqual(segment(f, env).seg, cold.seg);
  fs.writeFileSync(file, 'garbage\n');
  assert.strictEqual(segment(f, env).seg, cold.seg);
});
