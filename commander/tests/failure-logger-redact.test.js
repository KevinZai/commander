// M4: the PostToolUseFailure logger redacts secrets before anything reaches disk, clips long errors, and
// keeps its log owner-only (file 0600, a directory it creates 0700).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'post-tool-failure-logger.js');
const POSIX = process.platform !== 'win32';

function lane(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-failure-log-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return { home, env: { PATH: process.env.PATH, HOME: home, CCC_CONFIG_DIR: path.join(home, 'lane') } };
}

function runHook(env, payload) {
  const r = spawnSync(process.execPath, [HOOK], { env, input: JSON.stringify(payload), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout.trim()), { continue: true });
  return r;
}

function logOf(home) {
  return path.join(home, 'lane', 'commander', 'tool-failures.jsonl');
}

// Fixtures are assembled at run time so the source holds no literal secret shapes.
const SECRETS = {
  bearer: 'Bearer ' + 'eyJabc' + 'def0123456789xyz',
  basicCreds: Buffer.from('admin:' + 'hunter2pass').toString('base64'),
  ghToken: 'ghp' + '_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4',
  awsSecret: 'wJalrXUtnFEMI' + '/K7MDENG/bPxRfiCYEXAMPLEKEY',
  dbPassword: 'pg-' + 'S3cretValue',
  apiKey: 'sk-' + 'proj-0123456789abcdefABCDEF',
  quotedJson: 'q-' + 'Zx9Yw8Vu7Ts6',
};

test('secrets in the error text are redacted before the row is written', (t) => {
  const { home, env } = lane(t);
  const error = [
    `curl failed: Authorization: ${SECRETS.bearer}`,
    `proxy said Proxy-Authorization: Basic ${SECRETS.basicCreds}`,
    `GITHUB_TOKEN=${SECRETS.ghToken} git push`,
    `AWS_SECRET_ACCESS_KEY=${SECRETS.awsSecret}`,
    `export DATABASE_PASSWORD="${SECRETS.dbPassword}"`,
    `OPENAI_API_KEY=${SECRETS.apiKey}`,
    `{"client_secret": "${SECRETS.quotedJson}"}`,
  ].join('\n');
  runHook(env, { tool_name: 'Bash', error });

  const raw = fs.readFileSync(logOf(home), 'utf8');
  for (const [name, value] of Object.entries(SECRETS)) {
    assert.ok(!raw.includes(value), `${name} leaked into the log`);
  }
  const row = JSON.parse(raw.trim());
  assert.equal(row.tool_name, 'Bash');
  assert.match(row.error, /\[redacted\]/);
  assert.match(row.error, /GITHUB_TOKEN=\[redacted\]/, 'the variable name survives for debugging');
  assert.match(row.error, /AWS_SECRET_ACCESS_KEY=\[redacted\]/);
  assert.match(row.error, /curl failed/, 'non-secret context survives');
});

test('ordinary errors are kept as they are', (t) => {
  const { home, env } = lane(t);
  runHook(env, { tool_name: 'Read', error: 'ENOENT: no such file or directory, open /repo/src/a.js' });
  const row = JSON.parse(fs.readFileSync(logOf(home), 'utf8').trim());
  assert.equal(row.error, 'ENOENT: no such file or directory, open /repo/src/a.js');
});

test('long errors are clipped and a non-string error is serialised then redacted', (t) => {
  const { home, env } = lane(t);
  runHook(env, { tool_name: 'Bash', error: 'x'.repeat(20000) });
  runHook(env, { tool_name: 'WebFetch', error: { status: 401, headers: { authorization: SECRETS.bearer } } });
  const rows = fs.readFileSync(logOf(home), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(rows[0].error.length <= 4100, `clipped, got ${rows[0].error.length}`);
  assert.match(rows[0].error, /…\[clipped\]$/);
  assert.equal(typeof rows[1].error, 'string');
  assert.ok(!rows[1].error.includes(SECRETS.bearer), 'object error redacted');
});

test('the log is owner-only: file 0600, a new state dir 0700', { skip: !POSIX }, (t) => {
  const { home, env } = lane(t);
  runHook(env, { tool_name: 'Bash', error: 'boom' });
  assert.equal(fs.statSync(logOf(home)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(logOf(home))).mode & 0o777, 0o700);

  // A log an earlier release left world-readable is tightened on the next write.
  fs.chmodSync(logOf(home), 0o644);
  runHook(env, { tool_name: 'Bash', error: 'boom again' });
  assert.equal(fs.statSync(logOf(home)).mode & 0o777, 0o600);
});

// Codex #302 delta2 MEDIUM 5: arrays, multiline assignments and long tokens past the old scan limit.
const { pathToFileURL } = require('node:url');
const REDACT = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'lib', 'redact-log.mjs');

test('passwords in arrays are redacted', async () => {
  const { redactLogText } = await import(pathToFileURL(REDACT).href);
  const a = 'pw-' + 'Alpha12345';
  const b = 'pw-' + 'Bravo67890';
  for (const text of [
    `{"passwords": ["${a}", "${b}"]}`,
    `{"db": {"password": ["${a}"]}}`,
    `config.passwords = ['${a}', '${b}']`,
    `API_KEYS=(${a} ${b})`,
  ]) {
    const out = redactLogText(text);
    assert.ok(!out.includes(a) && !out.includes(b), `array leaked: ${out}`);
  }
  const obj = redactLogText({ secrets: [a, b], ok: ['fine'] });
  assert.ok(!obj.includes(a) && !obj.includes(b), obj);
  assert.ok(obj.includes('fine'), 'non-secret arrays survive');
});

test('multiline quoted assignments are redacted in full', async () => {
  const { redactLogText } = await import(pathToFileURL(REDACT).href);
  const l1 = 'line1-' + 'Q8w7e6r5';
  const l2 = 'line2-' + 'T4y3u2i1';
  for (const text of [
    `DB_PASSWORD="${l1}\n${l2}"\nnext`,
    `export PRIVATE_KEY='${l1}\n${l2}'`,
    `secret_key: "${l1}\n${l2}"`,
    `DB_PASSWORD="${l1}`,
  ]) {
    const out = redactLogText(text);
    assert.ok(!out.includes(l1) && !out.includes(l2), `multiline leaked: ${JSON.stringify(out)}`);
  }
});

test('a long quoted token that runs past the old scan limit is still redacted', async () => {
  const { redactLogText } = await import(pathToFileURL(REDACT).href);
  const token = 'tok' + 'Z'.repeat(20000);
  const out = redactLogText(`{"access_token": "${token}"}`, { max: 30000 });
  assert.ok(!out.includes('ZZZZZZZZ'), 'token prefix leaked');
  const late = 'x'.repeat(17000) + ` GITHUB_TOKEN=${SECRETS.ghToken}`;
  assert.ok(!redactLogText(late, { max: 20000 }).includes(SECRETS.ghToken), 'a secret past 16000 chars leaked');
});
