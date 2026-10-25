'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-parity.js');

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// A tree whose disk truth is: v8.2.0, 2 plugin skills, 3 ecosystem skills,
// 1 agent, 2 hook events, 3 handlers, 1 bundled MCP server.
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc parity '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'package.json', JSON.stringify({ name: 'fixture', version: '8.2.0' }));
  const plugin = 'commander/cowork-plugin';
  for (const s of ['ccc-a', 'ccc-b']) write(root, plugin + '/skills/' + s + '/SKILL.md', '---\nname: ' + s + '\n---\n');
  for (const s of ['x', 'y', 'z']) write(root, 'skills/' + s + '/SKILL.md', '---\nname: ' + s + '\n---\n');
  write(root, plugin + '/agents/builder.md', '# builder\n');
  write(root, plugin + '/agents/README.txt', 'not an agent\n');
  write(root, plugin + '/hooks/hooks.json', JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'a' }, { type: 'command', command: 'b' }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'c' }] }],
    },
  }));
  write(root, plugin + '/.mcp.json', JSON.stringify({ mcpServers: { context7: {} } }));
  write(root, 'README.md', [
    '# Fixture v8.2.0',
    '2 plugin skills, 3 ecosystem skills, 1 specialist agent.',
    '2 lifecycle hooks (3 handlers) and 1 bundled MCP server.',
    '### 3.3 Hooks',
    'The SEO pack has 12 skills.',
    '',
  ].join('\n'));
  write(root, 'docs/guide/intro.md', 'Install Commander 8.2.0 to get 2 hooks.\n');
  return root;
}

function runCheck(root) {
  return spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
}

test('passes when every surface matches the filesystem', (t) => {
  const r = runCheck(fixture(t));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK, 2 files consistent with disk \(v8\.2\.0, 2 plugin skills, 3 ecosystem skills, 1 agents, 2 hook events, 3 handlers, 1 bundled MCP\)/);
});

test('fails with file:line on injected count drift', (t) => {
  const root = fixture(t);
  write(root, 'README.md', fs.readFileSync(path.join(root, 'README.md'), 'utf8') + 'Now with 9 plugin skills and 30 hooks x 51 handlers.\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /3 mismatch\(es\)/);
  assert.match(r.stderr, /README\.md:6 {2}plugin skills "9 plugin skills" expected 2/);
  assert.match(r.stderr, /README\.md:6 {2}hooks "30 hooks" expected 2/);
  assert.match(r.stderr, /README\.md:6 {2}handlers "51 handlers" expected 3/);
});

test('fails on a stale version in a globbed docs file', (t) => {
  const root = fixture(t);
  write(root, 'docs/guide/intro.md', 'Install v8.0.0 to get 2 hooks.\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/guide\/intro\.md:1 {2}version "v8\.0\.0" expected 8\.2\.0/);
});

test('catches product version claims on another major', (t) => {
  const root = fixture(t);
  write(root, 'README.md', '# CC Commander v7.0.0\n' + fs.readFileSync(path.join(root, 'README.md'), 'utf8'));
  write(root, 'commander/core/registry.yaml', 'generated: 2026-10-25\nversion: 9.0.0\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /2 mismatch\(es\)/);
  assert.match(r.stderr, /README\.md:1 {2}version "CC Commander v7\.0\.0" expected 8\.2\.0/);
  assert.match(r.stderr, /registry\.yaml:2 {2}version "version: 9\.0\.0" expected 8\.2\.0/);
});

test('an allow-listed historical product version passes', (t) => {
  const root = fixture(t);
  write(root, 'docs/history.md', '### Features since Commander 7.4.2\nNode v20.19.0 and Claude Code 2.1.309 are not product claims.\n');
  write(root, 'scripts/parity-allowlist.json', JSON.stringify({
    entries: [{ file: 'docs/history.md', match: 'since Commander 7.4.2', what: 'version', reason: 'baseline heading' }],
  }));
  const r = runCheck(root);
  assert.equal(r.status, 0, r.stderr);
});

test('derives truth from disk: a new skill makes old claims drift', (t) => {
  const root = fixture(t);
  write(root, 'commander/cowork-plugin/skills/ccc-c/SKILL.md', '---\nname: ccc-c\n---\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /README\.md:2 {2}plugin skills "2 plugin skills" expected 3/);
});

test('flags vague catalog claims but not small subset counts', (t) => {
  const root = fixture(t);
  write(root, 'commander/cowork-plugin/lib/banner.txt', 'Guided AI PM · 450+ skills · 5 skills per pack\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /1 mismatch\(es\)/);
  assert.match(r.stderr, /banner\.txt:1 {2}bare skills "450\+ skills" expected 2 \| 3 \| 5/);
});

test('scans .parity-extra.txt for out-of-repo text', (t) => {
  const root = fixture(t);
  write(root, '.parity-extra.txt', '# GitHub About blurb\nPlugin · 60 skills + 9 hooks\n');
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\.parity-extra\.txt:2 {2}bare skills "60 skills"/);
  assert.match(r.stderr, /\.parity-extra\.txt:2 {2}hooks "9 hooks"/);
});

test('inline markers and the JSON allowlist exempt historical mentions', (t) => {
  const root = fixture(t);
  write(root, 'docs/history.md', [
    'Released v8.0.0 with 23 lifecycle hooks. <!-- parity-ignore -->',
    '<!-- parity-ignore-next-line -->',
    'v8.1.0 grew to 44 handlers.',
    'What changed in v8.1.1',
    '',
  ].join('\n'));
  write(root, 'mintlify-docs/old.mdx', 'Competitor X ships 17 skills and 38 agents.\n');
  write(root, 'scripts/parity-allowlist.json', JSON.stringify({
    entries: [
      { file: 'docs/*.md', match: 'What changed in v8.1.1', what: 'version', reason: 'release history heading' },
      { file: 'mintlify-docs/**', reason: 'competitor figures' },
    ],
  }));
  const r = runCheck(root);
  assert.equal(r.status, 0, r.stderr);
});

test('an allowlist entry limited to one rule still checks the others', (t) => {
  const root = fixture(t);
  write(root, 'docs/history.md', 'In v8.1.1 we had 7 lifecycle hooks.\n');
  write(root, 'scripts/parity-allowlist.json', JSON.stringify({
    entries: [{ file: 'docs/history.md', match: 'In v8.1.1', what: 'version', reason: 'history' }],
  }));
  const r = runCheck(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /1 mismatch\(es\)/);
  assert.match(r.stderr, /docs\/history\.md:1 {2}hooks "7 lifecycle hooks" expected 2/);
});

test('rejects an allowlist entry without a reason', (t) => {
  const root = fixture(t);
  write(root, 'scripts/parity-allowlist.json', JSON.stringify({ entries: [{ file: 'README.md' }] }));
  const r = runCheck(root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /entry 0 needs string "file" and a non-empty "reason"/);
});
