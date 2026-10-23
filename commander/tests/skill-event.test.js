#!/usr/bin/env node
// CC-361 slice 1: offline skill-event payload + opt-out fixtures. No network.

import { test } from 'node:test';
import assert from 'node:assert';
import { buildSkillEvent, isSkillTelemetryOptedOut } from '../cowork-plugin/lib/skill-event.mjs';

const base = { skill: 'ccc-review', anonId: '11111111-2222-4333-8444-555555555555', version: '4.1.0', surface: 'cli', os: 'darwin' };

test('payload has fixed anonymous shape', () => {
  assert.deepStrictEqual(buildSkillEvent(base), {
    event: 'skill_invoked',
    schema: 1,
    anon_id: base.anonId,
    properties: { skill: 'ccc-review', version: '4.1.0', surface: 'cli', os: 'darwin' },
  });
});

test('extra sensitive fields are dropped', () => {
  const p = buildSkillEvent({ ...base, prompt: 'secret text', cwd: '/Users/me/x', token: 'abc', email: 'a@b.c' });
  const json = JSON.stringify(p);
  for (const leak of ['secret text', '/Users/me', 'abc', 'a@b.c']) assert.ok(!json.includes(leak));
});

test('unsafe skill names are rejected', () => {
  for (const skill of ['/Users/me/skills/x', '../x', 'Has Space', '', 'a'.repeat(65), 'x\nINJECT', null, 42]) {
    assert.strictEqual(buildSkillEvent({ ...base, skill }), null, String(skill));
  }
});

test('missing anon id yields no payload', () => {
  assert.strictEqual(buildSkillEvent({ ...base, anonId: '' }), null);
});

test('unknown surface/version/os fall back safely', () => {
  const p = buildSkillEvent({ skill: 'x', anonId: 'id', surface: 'weird' });
  assert.deepStrictEqual(p.properties, { skill: 'x', version: 'unknown', surface: 'unknown', os: 'unknown' });
});

const optOutFixtures = [
  ['CCC_TELEMETRY=0', { env: { CCC_TELEMETRY: '0' } }],
  ['DO_NOT_TRACK=1', { env: { DO_NOT_TRACK: '1' } }],
  ['DO_NOT_TRACK=true', { env: { DO_NOT_TRACK: 'TRUE' } }],
  ['config.telemetry=false', { config: { telemetry: false } }],
];
for (const [name, ctx] of optOutFixtures) {
  test(`opt-out: ${name} produces no payload`, () => {
    assert.strictEqual(isSkillTelemetryOptedOut(ctx.env, ctx.config), true);
    assert.strictEqual(buildSkillEvent(base, ctx), null);
  });
}

test('not opted out by default or by unrelated values', () => {
  assert.strictEqual(isSkillTelemetryOptedOut({}, {}), false);
  assert.strictEqual(isSkillTelemetryOptedOut({ CCC_TELEMETRY: '1', DO_NOT_TRACK: '0' }, { telemetry: true }), false);
  assert.ok(buildSkillEvent(base, { env: { CCC_TELEMETRY: '1' } }));
});
