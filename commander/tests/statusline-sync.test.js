'use strict';
// CC-2103: `ccc statusline sync` compares each lane's live status line with
// this checkout's lib/ copies. Dry run by default; --apply archives, then copies.
// Every fixture is a temp HOME: no real config dir is read or written.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sync = require('../lib/statusline-sync');

const KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/**
 * home/.claude (lib with an old statusline.sh), .claude-ai1 pointing at
 * ~/.claude/lib, .claude-ai2 with its own lib via $HOME, .claude-ai3 with no
 * status line at all. source/ holds the checkout copies.
 */
function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline sync '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const cfg = (name) => path.join(home, name);
  for (const name of ['.claude', '.claude-ai1', '.claude-ai2', '.claude-ai3']) fs.mkdirSync(path.join(cfg(name), 'plugins'), { recursive: true });
  write(path.join(cfg('.claude'), 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: '~/.claude/lib/statusline.sh' } }));
  write(path.join(cfg('.claude-ai1'), 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: '~/.claude/lib/statusline.sh', padding: 1 } }));
  write(path.join(cfg('.claude-ai2'), 'settings.json'), JSON.stringify({ statusLine: { command: 'bash "$HOME/.claude-ai2/lib/statusline.sh"' } }));
  write(path.join(cfg('.claude'), 'lib', 'statusline.sh'), 'old line\nshared\n');
  write(path.join(cfg('.claude-ai2'), 'lib', 'statusline.sh'), 'new line\nshared\n');
  write(path.join(cfg('.claude-ai2'), 'lib', 'statusline-superfleet.sh'), 'sf\n');
  const source = path.join(home, 'source');
  write(path.join(source, 'statusline.sh'), 'new line\nshared\n');
  write(path.join(source, 'statusline-superfleet.sh'), 'sf\n');
  return { home, cfg, source };
}

function snapshot(dir) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8');
    }
  })(dir);
  return out;
}

function target(result, dir) {
  return result.targets.find((x) => x.dir === dir);
}

test('dry run reports same / differs / missing per target and changes nothing', (t) => {
  const f = fixture(t);
  const before = snapshot(f.home);
  const r = sync.plan({ home: f.home, sourceDir: f.source });
  assert.deepEqual(snapshot(f.home), before, 'dry run wrote nothing');
  assert.equal(r.applied, false);
  assert.equal(r.in_sync, false);
  assert.equal(sync.exitCode(r), 1);

  const shared = target(r, path.join(f.home, '.claude', 'lib'));
  assert.deepEqual(shared.lanes, ['pri', 'ai1'], 'lanes sharing one status line collapse into one target');
  assert.deepEqual(shared.files.map((x) => x.name + ':' + x.status), ['statusline.sh:differs', 'statusline-superfleet.sh:missing']);
  assert.deepEqual([shared.files[0].lines_added, shared.files[0].lines_removed], [1, 1]);

  const own = target(r, path.join(f.home, '.claude-ai2', 'lib'));
  assert.equal(own.from, 'settings');
  assert.equal(own.in_sync, true);

  const none = target(r, path.join(f.home, '.claude-ai3', 'lib'));
  assert.equal(none.configured, false, 'a lane with no status line is skipped, not drift');
  assert.deepEqual(none.files, []);
  assert.match(sync.render(r, f.home), /dry run; --apply copies/);
});

test('--lane filters targets; an unknown lane is exit 2', (t) => {
  const f = fixture(t);
  const r = sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai2' });
  assert.deepEqual(r.targets.map((x) => x.lanes), [['ai2']]);
  assert.equal(sync.exitCode(r), 0);
  assert.throws(() => sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai9' }), (e) => e.exitCode === 2 && /unknown lane "ai9"/.test(e.message));
});

test('--apply archives the old file first, then copies; nothing is deleted', (t) => {
  const f = fixture(t);
  const r = sync.apply(sync.plan({ home: f.home, sourceDir: f.source }), { now: '2026-10-24T18:00:00Z' });
  const dir = path.join(f.home, '.claude', 'lib');
  const shared = target(r, dir);
  assert.deepEqual(shared.files.map((x) => x.status), ['copied', 'copied']);
  assert.equal(fs.readFileSync(path.join(dir, 'statusline.sh'), 'utf8'), 'new line\nshared\n');
  assert.equal(fs.readFileSync(path.join(dir, 'statusline-superfleet.sh'), 'utf8'), 'sf\n');
  assert.equal(fs.statSync(path.join(dir, 'statusline.sh')).mode & 0o777, 0o755);

  const archived = path.join(f.home, '.claude', 'commander', 'archive', '2026-10-24T18-00-00-000Z', 'lib', 'statusline.sh');
  assert.equal(shared.files[0].archived_to, archived, 'archived under the config dir that owns the target');
  assert.equal(fs.readFileSync(archived, 'utf8'), 'old line\nshared\n');
  assert.equal(shared.files[1].archived_to, undefined, 'a missing file has nothing to archive');
  assert.equal(r.in_sync, true);
  assert.equal(sync.exitCode(r), 0);
  assert.equal(fs.existsSync(path.join(f.home, '.claude-ai3', 'lib')), false, 'an unconfigured lane gets no files');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['statusline-superfleet.sh', 'statusline.sh'], 'no temp files left behind');
});

test('--apply is idempotent: a second run copies and archives nothing', (t) => {
  const f = fixture(t);
  sync.apply(sync.plan({ home: f.home, sourceDir: f.source }), { now: '2026-10-24T18:00:00Z' });
  const before = snapshot(f.home);
  const again = sync.apply(sync.plan({ home: f.home, sourceDir: f.source }), { now: '2026-10-24T18:05:00Z' });
  assert.equal(again.in_sync, true);
  assert.deepEqual(snapshot(f.home), before);
});

test('a malformed settings.json warns and falls back to <config dir>/lib', (t) => {
  const f = fixture(t);
  write(path.join(f.cfg('.claude-ai3'), 'settings.json'), '{broken');
  write(path.join(f.cfg('.claude-ai3'), 'lib', 'statusline.sh'), 'new line\nshared\n');
  const r = sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai3' });
  assert.equal(r.targets[0].dir, path.join(f.home, '.claude-ai3', 'lib'));
  assert.deepEqual(r.targets[0].warnings, ['ai3: settings.json is not valid JSON']);
  assert.deepEqual(r.targets[0].files.map((x) => x.status), ['same', 'missing']);
  assert.equal(r.in_sync, false, 'an unknown running command is never in sync');
});

test('CLI: dry run by default, --json, and a flag without a value is exit 2', (t) => {
  const f = fixture(t);
  const env = { PATH: process.env.PATH, HOME: f.home };
  const before = snapshot(f.home);
  const dry = spawnSync(process.execPath, [KC, 'statusline', 'sync', '--home', f.home], { env, encoding: 'utf8' });
  assert.equal(dry.status, 1, dry.stderr);
  assert.match(dry.stdout, /dry run/);
  const json = spawnSync(process.execPath, [KC, 'statusline', 'sync', '--home', f.home, '--lane', 'ai1', '--json'], { env, encoding: 'utf8' });
  assert.equal(JSON.parse(json.stdout).schema, 1);
  assert.deepEqual(snapshot(f.home), before, 'the CLI dry run wrote nothing');
  const bad = spawnSync(process.execPath, [KC, 'statusline', 'sync', '--home', f.home, '--lane'], { env, encoding: 'utf8' });
  assert.equal(bad.status, 2);
  const usage = spawnSync(process.execPath, [KC, 'statusline'], { env, encoding: 'utf8' });
  assert.equal(usage.status, 2);
});

test('targetDir: quoted paths with spaces resolve; a custom command is skipped', (t) => {
  const f = fixture(t);
  const spaced = path.join(f.home, 'External Drive', 'claude lib');
  write(path.join(spaced, 'statusline.sh'), 'old\n');
  write(path.join(f.cfg('.claude-ai3'), 'settings.json'), JSON.stringify({ statusLine: { command: 'bash "' + path.join(spaced, 'statusline.sh') + '" --fast' } }));
  assert.deepEqual(sync.targetDir(f.cfg('.claude-ai3'), f.home), { dir: spaced, from: 'settings' });
  assert.deepEqual(sync.shellWords(`bash '/a b/statusline.sh' "x\\"y" z`), ['bash', '/a b/statusline.sh', 'x"y', 'z']);

  write(path.join(f.cfg('.claude-ai3'), 'settings.json'), JSON.stringify({ statusLine: { command: 'npx ccstatusline' } }));
  write(path.join(f.cfg('.claude-ai3'), 'lib', 'statusline.sh'), 'stale\n');
  const r = sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai3' });
  assert.equal(r.targets[0].from, 'custom');
  assert.equal(r.targets[0].configured, false);
  assert.equal(sync.exitCode(r), 0);
});

test('CLI: unknown or equals-form arguments exit 2 before any write', (t) => {
  const f = fixture(t);
  const env = { PATH: process.env.PATH, HOME: f.home };
  const before = snapshot(f.home);
  for (const extra of [['--lane=ai1', '--apply'], ['--apply', '--lanes', 'ai1'], ['--apply', 'ai1']]) {
    const r = spawnSync(process.execPath, [KC, 'statusline', 'sync', '--home', f.home].concat(extra), { env, encoding: 'utf8' });
    assert.equal(r.status, 2, extra.join(' '));
    assert.match(r.stderr, /unknown argument/);
  }
  assert.deepEqual(snapshot(f.home), before, 'nothing was applied');
});

test('a custom-command lane does not mask a lane that runs the shared status line', (t) => {
  const f = fixture(t);
  write(path.join(f.cfg('.claude'), 'settings.json'), JSON.stringify({ statusLine: { command: 'npx ccstatusline' } }));
  const r = sync.plan({ home: f.home, sourceDir: f.source });
  const shared = r.targets.find((x) => x.dir === path.join(f.home, '.claude', 'lib') && x.from === 'settings');
  assert.deepEqual(shared.lanes, ['ai1']);
  assert.equal(shared.configured, true);
  assert.equal(shared.files[0].status, 'differs');
  assert.ok(r.targets.some((x) => x.from === 'custom' && x.lanes.join() === 'pri' && !x.configured));
  assert.equal(sync.exitCode(r), 1);
});

test('malformed settings with no default status line is a failed inspection, not success', (t) => {
  const f = fixture(t);
  write(path.join(f.cfg('.claude-ai3'), 'settings.json'), '{broken');
  const r = sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai3' });
  assert.equal(r.in_sync, false);
  assert.equal(sync.exitCode(r), 1);
  assert.match(sync.render(r, f.home), /warning: ai3: settings.json is not valid JSON/);
  write(path.join(f.cfg('.claude-ai3'), 'lib', 'statusline.sh'), 'stale\n');
  const applied = sync.apply(sync.plan({ home: f.home, sourceDir: f.source, lane: 'ai3' }));
  assert.equal(fs.readFileSync(path.join(f.cfg('.claude-ai3'), 'lib', 'statusline.sh'), 'utf8'), 'stale\n', 'apply does not guess');
  assert.equal(sync.exitCode(applied), 1);
});
