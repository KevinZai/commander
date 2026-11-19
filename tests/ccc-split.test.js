// bin/ccc-split.sh against a fake tmux on PATH: never kill a live CCC session,
// and type a checkout path with spaces as one quoted word.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'bin', 'ccc-split.sh');

function setup(dirName, hasSession) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-split-'));
  const binDir = path.join(root, 'fakebin');
  const checkout = path.join(root, dirName, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(checkout, { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(checkout, 'ccc-split.sh'));
  const log = path.join(root, 'tmux.log');
  // Each invocation logs its argv NUL-separated, one invocation per line.
  fs.writeFileSync(path.join(binDir, 'tmux'), [
    '#!/bin/bash',
    `printf '%s\\0' "$@" >> ${JSON.stringify(log)}`,
    `printf '\\n' >> ${JSON.stringify(log)}`,
    `if [ "$1" = "has-session" ]; then exit ${hasSession ? 0 : 1}; fi`,
    'exit 0',
    '',
  ].join('\n'), { mode: 0o755 });
  fs.writeFileSync(path.join(binDir, 'tput'), '#!/bin/bash\necho 80\n', { mode: 0o755 });
  return { root, binDir, script: path.join(checkout, 'ccc-split.sh'), log };
}

function run(ctx) {
  const env = { ...process.env, PATH: `${ctx.binDir}:${process.env.PATH}`, HOME: ctx.root };
  delete env.CCC_TMUX_SESSION;
  delete env.TMUX;
  const r = spawnSync('bash', [ctx.script], { env, encoding: 'utf8', timeout: 10000 });
  const calls = fs.existsSync(ctx.log)
    ? fs.readFileSync(ctx.log, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\0').filter((x, i, a) => i < a.length - 1))
    : [];
  return { r, calls };
}

test('keeps an existing session', () => {
  const ctx = setup('checkout', true);
  try {
    const { r, calls } = run(ctx);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!calls.some((c) => c[0] === 'kill-session'), 'must not kill an existing session');
    assert.ok(!calls.some((c) => c[0] === 'new-session'), 'must not create a second session');
    const attach = calls.find((c) => c[0] === 'attach-session');
    assert.ok(attach, 'attaches to the existing session');
    assert.deepEqual(attach, ['attach-session', '-t', '=ccc']);
    assert.deepEqual(calls[0], ['has-session', '-t', '=ccc']);
  } finally {
    fs.rmSync(ctx.root, { recursive: true, force: true });
  }
});

test('quotes a checkout path with spaces', () => {
  const ctx = setup('my checkout dir', false);
  try {
    const { r, calls } = run(ctx);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(calls.some((c) => c[0] === 'new-session'));
    const keys = calls.filter((c) => c[0] === 'send-keys');
    assert.equal(keys.length, 2, JSON.stringify(keys));
    assert.equal(keys[0][3], '-l', 'launch line is sent literally');
    const line = keys[0][4];
    const kc = path.join(path.dirname(ctx.script), 'kc.js');
    assert.ok(line.endsWith('node ' + kc.replace(/ /g, '\\ ')), line);
    assert.deepEqual(keys[1], ['send-keys', '-t', 'ccc', 'Enter']);
    // The typed line must word-split back to the real path in a shell.
    const echo = spawnSync('bash', ['-c', line.replace(/^.*&& node /, 'printf %s ')], { encoding: 'utf8' });
    assert.equal(echo.stdout, kc);
  } finally {
    fs.rmSync(ctx.root, { recursive: true, force: true });
  }
});
