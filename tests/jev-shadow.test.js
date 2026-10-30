'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const dir = path.join(__dirname, '..', 'scripts', 'jev-shadow');
const fixture = path.join(dir, 'fixtures', 'events.jsonl');
const load = (f) => import(pathToFileURL(path.join(dir, f)).href);

test('redact masks keys, tokens, bearer and emails', async () => {
  const { redact } = await load('record.mjs');
  const s = redact('sk-abc12345678 ghp_abcdefgh1234 lin_api_abcdefgh1234 Bearer abcdef1234567890 a.b@x.com');
  for (const secret of ['sk-abc', 'ghp_abc', 'lin_api_abc', 'abcdef1234567890', 'a.b@x.com']) {
    assert.ok(!s.includes(secret), `leaked ${secret}`);
  }
  assert.match(s, /REDACTED/);
});

test('normalizeEvent validates and redacts', async () => {
  const { normalizeEvent } = await load('record.mjs');
  const row = normalizeEvent({ ts: '2026-10-22T09:00:00Z', kind: 'permission', input: 'mail me@x.io', incumbentDecision: 'allow' });
  assert.strictEqual(row.input, 'mail [REDACTED_EMAIL]');
  assert.strictEqual(row.ts, '2026-10-22T09:00:00.000Z');
  assert.throws(() => normalizeEvent({ ts: 'x', kind: 'permission', input: '', incumbentDecision: 'allow' }));
  assert.throws(() => normalizeEvent({ ts: '2026-10-22', kind: 'bogus', input: '', incumbentDecision: 'allow' }));
});

test('compare computes agreement, confusion, disagreements and cost', async () => {
  const { compare } = await load('compare.mjs');
  const mk = (kind, input, incumbentDecision) => ({ ts: 't', kind, input, incumbentDecision });
  const rows = [mk('permission', 'rm -rf /', 'deny'), mk('permission', 'ls', 'deny'), mk('route', 'run tests', 'test-runner')];
  const r = compare(rows, (row) => (row.input === 'ls' ? 'allow' : row.kind === 'route' ? 'test-runner' : 'deny'), { usdPerMTok: 1 });
  assert.strictEqual(r.total, 3);
  assert.ok(Math.abs(r.agreement - 2 / 3) < 1e-9);
  assert.strictEqual(r.perKind.permission.agree, 1);
  assert.strictEqual(r.perKind.route.rate, 1);
  assert.strictEqual(r.confusion.permission.deny.allow, 1);
  assert.strictEqual(r.unsafeAllows, 1);
  assert.strictEqual(r.permissionDenyAgreement, 0.5);
  assert.strictEqual(r.disagreements.length, 1);
  assert.ok(Math.abs(r.estCostUsd - r.estTokens / 1e6) < 1e-12);
});

test('CLI prints a markdown report for the fixture, offline and redacted', () => {
  const out = execFileSync(process.execPath, [path.join(dir, 'compare.mjs'), fixture], { encoding: 'utf8' });
  assert.match(out, /^# Jev shadow report/);
  assert.match(out, /Events: 13/);
  assert.match(out, /\| permission \|/);
  assert.match(out, /## Disagreements/);
  assert.match(out, /opus/);
  assert.ok(!out.includes('abcdef1234567890'));
});

// Fake credentials are assembled at runtime so no realistic secret literal lives in the repo.
const A36 = 'a1B2c3D4'.repeat(5);
const SECRETS = {
  'AWS AKIA key': ['AKIA' + 'X'.repeat(16), 'key id AKIA' + 'X'.repeat(16) + ' end'],
  'AWS ASIA key': ['ASIA' + 'Y'.repeat(16), 'ASIA' + 'Y'.repeat(16)],
  'Stripe sk_live': ['sk_' + 'live_' + A36, 'k=sk_' + 'live_' + A36],
  'Stripe sk_test': ['sk_' + 'test_' + A36, 'sk_' + 'test_' + A36],
  'Stripe rk_live': ['rk_' + 'live_' + A36, 'rk_' + 'live_' + A36],
  'Stripe rk_test': ['rk_' + 'test_' + A36, 'rk_' + 'test_' + A36],
  'Slack xoxb': ['xox' + 'b-' + '1234567890-abcdefABCDEF', 'xox' + 'b-' + '1234567890-abcdefABCDEF'],
  'Slack xoxp': ['xox' + 'p-' + '1234567890-abcdefABCDEF', 'xox' + 'p-' + '1234567890-abcdefABCDEF'],
  'Slack xoxa': ['xox' + 'a-' + '1234567890-abcdefABCDEF', 'xox' + 'a-' + '1234567890-abcdefABCDEF'],
  'Slack xoxr': ['xox' + 'r-' + '1234567890-abcdefABCDEF', 'xox' + 'r-' + '1234567890-abcdefABCDEF'],
  'Slack xoxs': ['xox' + 's-' + '1234567890-abcdefABCDEF', 'xox' + 's-' + '1234567890-abcdefABCDEF'],
  'GitHub fine-grained PAT': ['github' + '_pat_' + 'A1b2C3d4E5_f6G7h8', 'token github' + '_pat_' + 'A1b2C3d4E5_f6G7h8'],
  'GitHub gho': ['gh' + 'o_' + A36, 'gh' + 'o_' + A36],
  'GitHub ghs': ['gh' + 's_' + A36, 'gh' + 's_' + A36],
  'JWT': ['ey' + 'JhbGciOiJIUzI1NiJ9.ey' + 'JzdWIiOiIxMjM0NTY3ODkwIn0.sig_AbC-123', 'jwt ey' + 'JhbGciOiJIUzI1NiJ9.ey' + 'JzdWIiOiIxMjM0NTY3ODkwIn0.sig_AbC-123 x'],
  'Authorization Basic': ['dXNlcjpwYXNzd29yZDEyMw==', 'Authorization: Basic dXNlcjpwYXNzd29yZDEyMw=='],
  'npm token': ['npm' + '_' + A36.slice(0, 36), 'npm' + '_' + A36.slice(0, 36)],
  'PEM private key': [
    'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
    'x -----BEGIN ' + 'PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\nabcdEFGH\n-----END ' + 'PRIVATE KEY----- y',
  ],
  'PEM RSA private key': [
    'MIIEowIBAAKCAQEA7zzzz',
    '-----BEGIN RSA ' + 'PRIVATE KEY-----\nMIIEowIBAAKCAQEA7zzzz\n-----END RSA ' + 'PRIVATE KEY-----',
  ],
  'PEM block with no END marker': [
    'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
    '-----BEGIN ' + 'PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
  ],
  'generic key=': ['hunter2hunter2', 'api_key=hunter2hunter2'],
  'generic apikey:': ['hunter2hunter2', 'apikey: hunter2hunter2'],
  'generic api-key=': ['hunter2hunter2', 'API-KEY = hunter2hunter2'],
  'generic token:': ['hunter2hunter2', 'token: hunter2hunter2'],
  'generic secret=': ['hunter2hunter2', 'client_secret=hunter2hunter2'],
  'generic password:': ['hunter2hunter2', 'password: hunter2hunter2'],
  'generic passwd=': ['hunter2hunter2', 'passwd=hunter2hunter2'],
  'generic quoted JSON value': ['correct horse battery', '{"password": "correct horse battery"}'],
};

for (const [name, [secret, input]] of Object.entries(SECRETS)) {
  test(`redact masks ${name}`, async () => {
    const { redact } = await load('record.mjs');
    const out = redact(input);
    assert.ok(!out.includes(secret), `leaked: ${out}`);
    assert.match(out, /REDACTED/);
    assert.strictEqual(redact(out), out, 'idempotent');
  });
}

test('redact leaves ordinary text alone', async () => {
  const { redact } = await load('record.mjs');
  const s = 'npm run test && git status --short; ls -la /tmp/skeleton';
  assert.strictEqual(redact(s), s);
});

test('normalizeEvent error messages do not echo raw secrets', async () => {
  const { normalizeEvent } = await load('record.mjs');
  const secret = 'AKIA' + 'Z'.repeat(16);
  assert.throws(
    () => normalizeEvent({ ts: '2026-10-22', kind: 'k ' + secret, input: '', incumbentDecision: 'allow' }),
    (e) => /invalid kind/.test(e.message) && !e.message.includes(secret) && /REDACTED/.test(e.message),
  );
  assert.throws(
    () => normalizeEvent({ ts: 'password=' + secret, kind: 'permission', input: '', incumbentDecision: 'allow' }),
    (e) => /invalid ts/.test(e.message) && !e.message.includes(secret) && /REDACTED/.test(e.message),
  );
});

test('loadEvents errors do not echo raw secrets from malformed lines', async () => {
  const { loadEvents } = await load('compare.mjs');
  const secret = 'AKIA' + 'Q'.repeat(16);
  assert.throws(
    () => loadEvents('{"ts": "2026-10-22T00:00:00Z", "kind": "permission" ' + secret + '\n'),
    (e) => /line 1/.test(e.message) && !e.message.includes(secret),
  );
});

test('compare redacts raw rows itself (defense in depth)', async () => {
  const { compare } = await load('compare.mjs');
  const secret = 'AKIA' + 'W'.repeat(16);
  const row = { ts: 't', kind: 'permission', input: 'curl -H x ' + secret + ' me@x.io', incumbentDecision: 'deny' };
  let seen;
  const r = compare([row], (rw) => { seen = rw.input; return 'allow'; });
  assert.ok(!JSON.stringify(r).includes(secret), 'result leaks secret');
  assert.ok(!JSON.stringify(r).includes('me@x.io'), 'result leaks email');
  assert.ok(!seen.includes(secret), 'judge saw raw secret');
  assert.strictEqual(r.disagreements.length, 1);
  assert.match(r.disagreements[0].input, /REDACTED/);
  assert.strictEqual(row.input.includes(secret), true, 'caller row not mutated');
});

test('renderReport redacts disagreement input even from hand-built raw results', async () => {
  const { renderReport, compare } = await load('compare.mjs');
  const secret = 'ghp' + '_' + 'abcdefgh12345678';
  const base = compare([]);
  const out = renderReport({
    ...base,
    total: 1,
    disagreements: [{ ts: 't', kind: 'permission', input: 'token ' + secret + ' ' + 'x'.repeat(5), incumbent: 'deny', judge: 'allow' }],
  });
  assert.ok(!out.includes(secret), out);
  assert.match(out, /REDACTED/);
  // Redaction runs before the 120-char cut, so a secret straddling the cut cannot leak a prefix.
  const long = renderReport({
    ...base,
    disagreements: [{ ts: 't', kind: 'permission', input: 'a'.repeat(110) + ' ' + secret, incumbent: 'deny', judge: 'allow' }],
  });
  assert.ok(!long.includes('ghp'), long);
});

test('compare and renderReport end to end on raw rows never print the secret', async () => {
  const { renderReport, compare } = await load('compare.mjs');
  const secret = 'sk_' + 'live_' + A36;
  const out = renderReport(compare([{ ts: 't', kind: 'route', input: 'deploy with ' + secret, incumbentDecision: 'opus' }]));
  assert.ok(!out.includes(secret), out);
});
