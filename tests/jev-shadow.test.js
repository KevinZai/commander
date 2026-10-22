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
