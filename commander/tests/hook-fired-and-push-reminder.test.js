// CC-1360 (Fable audit F13, F21):
// - F13: every PreToolUse/PostToolUse/PermissionRequest hook below queues a
//   `hook_fired` event on a normal payload, not only when stdin fails to parse.
// - F21: git-push-reminder warns the user (systemMessage) about a force-push
//   that lands on main/master, resolving the current branch when the command
//   names no refspec.

'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const HOOKS_DIR = path.join(PLUGIN, 'hooks');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-cc1360-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// Preload: stub fetch to record each telemetry batch, and flush the queue when
// the hook's event loop drains (the real client's batch timer is unref'd).
const PRELOAD = path.join(TMP, 'capture-telemetry.mjs');
fs.writeFileSync(PRELOAD, [
  "import fs from 'node:fs';",
  `import { flushBatch } from ${JSON.stringify(pathToFileURL(path.join(PLUGIN, 'lib', 'telemetry.mjs')).href)};`,
  'globalThis.fetch = async (_url, opts) => { fs.appendFileSync(process.env.CCC_TEST_TELEMETRY_OUT, opts.body + "\\n"); return { ok: true }; };',
  "process.on('beforeExit', () => { flushBatch(); });",
].join('\n'));

function runHook(file, input, { env = {}, preload = false } = {}) {
  const home = fs.mkdtempSync(path.join(TMP, 'home-'));
  const args = preload ? ['--import', pathToFileURL(PRELOAD).href, path.join(HOOKS_DIR, file)] : [path.join(HOOKS_DIR, file)];
  const r = spawnSync(process.execPath, args, {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return r;
}

describe('hook_fired is tracked on a normal payload (F13)', () => {
  const cases = [
    ['config-protection.js', 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }],
    ['cost-ceiling-enforcer.js', 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }],
    ['console-log-warn.js', 'PostToolUse', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }],
    ['git-push-reminder.js', 'PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }],
    ['doc-file-warning.js', 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }],
    ['permission-gate.js', 'PermissionRequest', { tool_name: 'Read', tool_input: { file_path: 'README.md' } }],
    ['secret-leak-guard.js', 'PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }],
    ['pr-link-notify.js', 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' }, tool_response: { stdout: '' } }],
  ];

  for (const [file, hook, payload] of cases) {
    it(file, () => {
      const out = path.join(TMP, `${file}.events.jsonl`);
      runHook(file, { session_id: 'cc1360', cwd: TMP, ...payload }, {
        preload: true,
        env: { CCC_TELEMETRY: '1', CCC_TEST_TELEMETRY_OUT: out },
      });
      const events = fs.existsSync(out)
        ? fs.readFileSync(out, 'utf8').trim().split('\n').flatMap((l) => JSON.parse(l).events)
        : [];
      const fired = events.filter((e) => e.name === 'hook_fired');
      assert.deepEqual(fired.map((e) => [e.properties.hook, e.properties.handler]), [[hook, file.replace(/\.js$/, '')]]);
    });
  }
});

describe('git-push-reminder force-push warning (F21)', () => {
  const repo = path.join(TMP, 'repo');
  fs.mkdirSync(repo);
  const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');

  function warning(command) {
    const r = runHook('git-push-reminder.js', { tool_name: 'Bash', tool_input: { command }, cwd: repo });
    const parsed = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.equal(parsed.continue, true);
    return parsed.systemMessage || '';
  }

  it('bare force-push while on main warns via systemMessage', () => {
    git('checkout', '-q', 'main');
    assert.match(warning('git push --force'), /force-push to main/);
    assert.match(warning('git push -f origin'), /force-push to main/);
    assert.equal(warning('git push --force --tags origin'), '');
    assert.match(warning('git push -f --tags origin main'), /force-push to main/);
    assert.match(warning('git push --force --all origin'), /force-push to every branch/);
    assert.match(warning('git push -f --mirror backup'), /force-push to every branch/);
    assert.match(warning('cd . && git push --force-with-lease origin HEAD'), /force-push to main/);
  });

  it('force-push naming main warns from any branch', () => {
    git('checkout', '-q', '-B', 'feature');
    assert.match(warning('git push --force origin main'), /force-push to main/);
    assert.match(warning('git push origin +master'), /force-push to master/);
    assert.match(warning('git push -f origin feature:main'), /force-push to main/);
    assert.match(warning('git push --force origin "main"'), /force-push to main/);
    assert.match(warning("git push -f 'origin' 'feature:main'"), /force-push to main/);
    assert.match(warning('git push --force --repo=origin origin main'), /force-push to main/);
    assert.match(warning('(git push -f origin main)'), /force-push to main/);
    assert.match(warning('echo $(git push -f origin main)'), /force-push to main/);
    assert.match(warning('git push -f origin main>/tmp/push.log'), /force-push to main/);
    assert.match(warning('git push -f origin main 2>&1 | tail -1'), /force-push to main/);
    assert.match(warning('git push -f > /tmp/push.log origin main'), /force-push to main/);
    assert.match(warning('git push -f &>/tmp/push.log origin main'), /force-push to main/);
    assert.match(warning('/usr/bin/git push -f origin main'), /force-push to main/);
    assert.match(warning("bash -c 'git push -f origin main'"), /force-push to main/);
    assert.match(warning('sh -c "cd . && git push -f origin master"'), /force-push to master/);
    assert.match(warning("eval 'git push -f origin main'"), /force-push to main/);
    assert.match(warning("git push origin feature; eval 'git push -f origin main'"), /force-push to main/);
  });

  it('no warning for a force-push to another branch or a plain push', () => {
    git('checkout', '-q', 'main');
    assert.equal(warning('git push -f origin feature'), '');
    assert.equal(warning('git push origin main'), '');
    assert.equal(warning('git push'), '');
    git('checkout', '-q', 'feature');
    assert.equal(warning('git push --force'), '');
    assert.equal(warning('git push --force origin feature-main'), '');
    assert.equal(warning('git push -f origin 2>/dev/null'), '');
    assert.equal(warning('git push origin +feature main'), '');
    // A positional repository overrides --repo, so `main` here names the repository.
    assert.equal(warning('git push --force --repo=origin main'), '');
    assert.equal(warning('git push --force-if-includes origin main'), '');
  });

  it('resolves HEAD in the directory a leading cd moves to', () => {
    const other = path.join(TMP, 'other repo');
    fs.mkdirSync(other);
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: other, stdio: 'ignore' });
    execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: other, stdio: 'ignore' });
    git('checkout', '-q', 'feature');
    assert.match(warning(`cd "${other}" && git push --force origin HEAD`), /force-push to main/);
    assert.match(warning("cd '../other repo' && git push -f"), /force-push to main/);
    assert.match(warning('cd ../other\\ repo; git push -f'), /force-push to main/);
    git('checkout', '-q', 'main');
    execFileSync('git', ['checkout', '-q', '-b', 'topic'], { cwd: other, stdio: 'ignore' });
    assert.equal(warning(`cd "${other}" && git push --force origin HEAD`), '');
  });
});
