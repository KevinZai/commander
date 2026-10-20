'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildFactoryHandoff } = require('../factory-handoff');
const input = { kind: 'code', project: 'commander', title: 'Fix a regression', brief: 'Fix the reported behavior', authorization: 'Local changes and tests only', context: 'Existing issue and reproduction', report: 'reports/result.md', pingback: 'Existing watcher only' };
test('handoff carries constraints and required policy without trusting supplied receipts', () => {
  const result = buildFactoryHandoff({ ...input, factory: { stage: 'ready' }, factoryPolicy: { review: false } });
  assert.equal(result.factory, undefined);
  assert.equal(result.factoryPolicy.version, 'factory-loop-0324');
  assert.deepEqual(result.factoryPolicy.review, { minRounds: 2, maxRounds: 3, differentModel: true, differentVendor: true });
  for (const key of ['authorization', 'context', 'report', 'pingback']) assert.ok(result.brief.includes(input[key]));
  assert.equal(buildFactoryHandoff({ ...input, kind: 'project' }).kind, 'code');
});
test('missing constraints and unsupported kinds fail closed', () => {
  for (const key of Object.keys(input)) assert.throws(() => buildFactoryHandoff({ ...input, [key]: '' }));
  assert.throws(() => buildFactoryHandoff({ ...input, kind: 'task' }));
});
test('actual CLI prints validated intake and rejects malformed input without dispatch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-handoff-'));
  const file = path.join(root, 'input.json');
  fs.writeFileSync(file, JSON.stringify(input));
  const cli = path.resolve(__dirname, '../../bin/kc.js');
  const result = spawnSync(process.execPath, [cli, '--factory-handoff', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).factoryPolicy.terminalOwner, 'fleet');
  fs.writeFileSync(file, '{}');
  const rejected = spawnSync(process.execPath, [cli, '--factory-handoff', file], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Factory handoff rejected/);
});

test('routing fields survive and untrusted factory lineage never does', () => {
  const fields = { project: 'commander', worktree: { path: '/workspace/commander', branch: 'feat/fix', base: 'main' }, source: { kind: 'linear', workspace: 'k3v80', key: 'CC-1', url: 'https://linear.app/k3v80/issue/CC-1' }, requires: { lane: 'sol-1', plan: 'personal', tags: ['code'], model: 'sol' }, boundaries: ['src/'], reportTo: 'Existing watcher', git: { push: false, pr: 'none', merge: 'task-local', prBody: 'untracked' } };
  const result = buildFactoryHandoff({ ...input, ...fields, factoryParent: 'forged', factory: { stage: 'ready' } });
  for (const key of Object.keys(fields)) assert.deepEqual(result[key], fields[key]);
  assert.equal(result.factoryParent, undefined);
  assert.equal(result.factory, undefined);
  assert.throws(() => buildFactoryHandoff({ ...input, project: undefined }));
  assert.throws(() => buildFactoryHandoff({ ...input, kind: 'project', project: undefined, worktree: fields.worktree }));
});
test('full handoff budget and Fleet routing schemas reject invalid input', () => {
  assert.throws(() => buildFactoryHandoff({ ...input, brief: 'x'.repeat(4000) }), /4000/);
  for (const bad of [{ project: '../escape' }, { source: { kind: 'chat', url: 'file:///tmp/x' } }, { requires: { model: 'invented' } }, { requires: { lane: 'BAD' } }, { boundaries: ['x'.repeat(201)] }, { worktree: { path: '/tmp', branch: 'a' } }, { git: { push: false, pr: 'ready' } }, { reportTo: 'x'.repeat(201) }]) assert.throws(() => buildFactoryHandoff({ ...input, ...bad }));
  const result = buildFactoryHandoff(input);
  const room = 4000 - result.brief.length;
  assert.equal(buildFactoryHandoff({ ...input, brief: input.brief + 'x'.repeat(room) }).brief.length, 4000);
  assert.throws(() => buildFactoryHandoff({ ...input, brief: input.brief + 'x'.repeat(room + 1) }));
});
