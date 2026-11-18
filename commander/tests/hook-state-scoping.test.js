// Codex audit #25, #26, #28: hook state is scoped to its owner and updated atomically.
//   - the tool-call counter survives concurrent PreToolUse processes without losing increments
//   - test/lint/audit outcomes are per workspace and per git revision
//   - telemetry reports the plugin's own manifest version, never the customer project's
'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const HOOKS = path.join(PLUGIN, 'hooks');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-hook-scope-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const load = (rel) => import(pathToFileURL(path.join(PLUGIN, rel)).href);

function cleanEnv(extra) {
  const env = { ...process.env, MCP_DISABLED: '1', ...extra };
  for (const k of ['CLAUDE_SESSION_ID', 'CCC_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'CCC_TELEMETRY']) delete env[k];
  return env;
}

function runAsync(file, input, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
    child.stdin.end(JSON.stringify(input));
  });
}

describe('tool-call counter (Codex audit #26)', () => {
  it('updateJson serializes concurrent in-process increments', async () => {
    const { updateJson } = await load('hooks/lib/atomic-json.mjs');
    const file = path.join(TMP, 'counter', 'c.json');
    await Promise.all(Array.from({ length: 25 }, () => updateJson(file, (c) => ({ n: (c.n || 0) + 1 }))));
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).n, 25);
    assert.ok(!fs.existsSync(`${file}.lock`), 'lock released');
    assert.deepEqual(fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith('.tmp')), [], 'no temp files left');
  });

  it('updateJson breaks a stale lock left by a crashed process', async () => {
    const { updateJson } = await load('hooks/lib/atomic-json.mjs');
    const file = path.join(TMP, 'stale', 'c.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.lock`, '99999');
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(`${file}.lock`, old, old);
    const r = await updateJson(file, () => ({ n: 1 }));
    assert.equal(r.locked, true);
  });

  it('parallel PreToolUse dispatcher processes count every call', async () => {
    const home = fs.mkdtempSync(path.join(TMP, 'home-'));
    const env = cleanEnv({ HOME: home, USERPROFILE: home });
    const N = 12;
    const runs = await Promise.all(Array.from({ length: N }, () =>
      runAsync(path.join(HOOKS, 'orchestrator', 'pre-tool-use-dispatcher.js'), { session_id: 'race', tool_name: 'Bash', tool_input: { command: 'ls' } }, env)));
    for (const r of runs) assert.equal(r.code, 0);
    const cost = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'commander', 'sessions', 'active-cost-race.json'), 'utf8'));
    assert.equal(cost.toolCalls, N);
  });
});

describe('test results are scoped to workspace and revision (Codex audit #25)', () => {
  function gitRepo(name) {
    const dir = fs.mkdtempSync(path.join(TMP, `${name}-`));
    const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.test', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.test' } });
    git('init', '-q');
    fs.writeFileSync(path.join(dir, 'a.txt'), '1');
    git('add', '.');
    git('commit', '-q', '-m', 'one');
    return { dir, git };
  }

  it('a result recorded in project A is invisible in project B', async () => {
    const { recordResult, readResults } = await load('hooks/lib/test-results.mjs');
    const state = fs.mkdtempSync(path.join(TMP, 'state-'));
    const a = gitRepo('proj-a');
    const b = gitRepo('proj-b');
    await recordResult(state, a.dir, 'test', 'failing');
    assert.equal(readResults(state, a.dir).test, 'failing');
    assert.equal(readResults(state, b.dir).test, 'unknown');
  });

  it('a subdirectory counts for its repository, and a new commit hides the old result', async () => {
    const { recordResult, readResults, workspaceOf } = await load('hooks/lib/test-results.mjs');
    const state = fs.mkdtempSync(path.join(TMP, 'state-'));
    const a = gitRepo('proj-rev');
    fs.mkdirSync(path.join(a.dir, 'pkg'));
    const rev = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: a.dir, encoding: 'utf8' }).trim();
    assert.equal(workspaceOf(path.join(a.dir, 'pkg')).revision, rev, 'revision read from .git without spawning git');
    await recordResult(state, path.join(a.dir, 'pkg'), 'lint', 'passing');
    assert.equal(readResults(state, a.dir).lint, 'passing');
    fs.writeFileSync(path.join(a.dir, 'a.txt'), '2');
    a.git('commit', '-q', '-am', 'two');
    assert.equal(readResults(state, a.dir).lint, 'unknown');
  });

  it('reads the revision of a linked worktree and of packed refs', async () => {
    const { headRevision, findGitDirs } = await load('hooks/lib/test-results.mjs');
    const a = gitRepo('proj-wt');
    const wt = path.join(TMP, `wt-${Date.now()}`);
    a.git('worktree', 'add', '-q', '-b', 'side', wt);
    a.git('pack-refs', '--all');
    const expected = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: wt, encoding: 'utf8' }).trim();
    assert.equal(headRevision(findGitDirs(wt)), expected);
    assert.equal(headRevision(findGitDirs(a.dir)), execFileSync('git', ['rev-parse', 'HEAD'], { cwd: a.dir, encoding: 'utf8' }).trim());
  });

  it('knowledge-capture records into the payload cwd, and suggest-ticker reads only that workspace', async () => {
    const home = fs.mkdtempSync(path.join(TMP, 'home-'));
    const a = gitRepo('kc-a');
    const r = spawnSync(process.execPath, [path.join(HOOKS, 'knowledge-capture.js')], {
      input: JSON.stringify({ hook_event_name: 'PostToolUse', cwd: a.dir, tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: { exit_code: 1 } }),
      env: cleanEnv({ HOME: home, USERPROFILE: home }), encoding: 'utf8', timeout: 8000,
    });
    assert.equal(r.status, 0);
    const { readResults } = await load('hooks/lib/test-results.mjs');
    const state = path.join(home, '.claude', 'commander');
    assert.equal(readResults(state, a.dir).test, 'failing');
    assert.ok(!fs.existsSync(path.join(state, 'last-test-result.json')), 'no lane-wide cache');
  });
});

describe('telemetry version (Codex audit #28)', () => {
  it("reads the plugin manifest, not the customer's package.json", async () => {
    const { getPluginVersion } = await load('lib/telemetry.mjs');
    const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(getPluginVersion(), manifest.version);
    assert.equal(getPluginVersion(fs.mkdtempSync(path.join(TMP, 'no-manifest-'))), 'unknown');
    const src = fs.readFileSync(path.join(PLUGIN, 'lib', 'telemetry.mjs'), 'utf8');
    assert.doesNotMatch(src, /4\.1\.0-beta\.2/);
    assert.doesNotMatch(src, /process\.cwd\(\),\s*'package\.json'/);
  });
});
