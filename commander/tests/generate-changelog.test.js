'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'generate-changelog.js');
const DATE = '2026-04-26';

function hash(char) {
  return char.repeat(40);
}

function fixtureChangelog() {
  return [
    '# Changelog',
    '',
    'All notable changes to CC Commander will be documented in this file.',
    '',
    '## [4.0.0-beta.11] — 2026-04-24 — Existing entry',
    '',
    '### Headline',
    '',
    'Existing beta.11 notes stay intact.',
    '',
    '---',
    '',
    '## [4.0.0-beta.10] — 2026-04-23 — Older entry',
    '',
    'Older notes stay intact.',
    '',
  ].join('\n');
}

function makeTempChangelog(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-changelog-'));
  const changelogPath = path.join(dir, 'CHANGELOG.md');
  fs.writeFileSync(changelogPath, fixtureChangelog(), 'utf8');
  t.after(function () {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return changelogPath;
}

function runGenerator(args, input) {
  return spawnSync(process.execPath, [SCRIPT].concat(args), {
    input,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function baseArgs(changelogPath, extra) {
  return [
    '--changelog',
    changelogPath,
    '--version',
    'v4.0.0-beta.12',
    '--date',
    DATE,
  ].concat(extra || []);
}

test('parses a fake git log fixture into categorized changelog output', function (t) {
  const changelogPath = makeTempChangelog(t);
  const input = [
    hash('a') + '|feat(skills): add replay skill|',
    hash('b') + '|fix(security): sanitize webhook source|',
    hash('c') + '|fix(cli): handle missing config|',
    hash('d') + '|chore(release): add changelog gate|',
    hash('e') + '|feat(agent): tune reviewer persona|',
    hash('f') + '|docs: update install guide|',
    hash('1') + '|test(parser): cover git log parser|',
    hash('2') + '|feat(brand): unify Commander naming|',
  ].join('\n');

  const result = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /^## \[4\.0\.0-beta\.12\] — 2026-04-26 — Conventional commit rollup/m);
  assert.match(result.stdout, /### 🚀 New\n\n- \*\*skills\*\* — Add replay skill/);
  assert.match(result.stdout, /### 🔒 Security\n\n- \*\*security\*\* — Sanitize webhook source/);
  assert.match(result.stdout, /### 🐛 Fixes\n\n- \*\*cli\*\* — Handle missing config/);
  assert.match(result.stdout, /### 🏗️ Infrastructure\n\n- \*\*release\*\* — Add changelog gate/);
  assert.match(result.stdout, /### 🤖 Agent improvements\n\n- \*\*agent\*\* — Tune reviewer persona/);
  assert.match(result.stdout, /### 📚 Docs\n\n- Update install guide/);
  assert.match(result.stdout, /### 🧪 Tests\n\n- \*\*parser\*\* — Cover git log parser/);
  assert.match(result.stdout, /### 🏷️ Branding\n\n- \*\*brand\*\* — Unify Commander naming/);
});

test('--dry-run does not modify CHANGELOG.md', function (t) {
  const changelogPath = makeTempChangelog(t);
  const before = fs.readFileSync(changelogPath, 'utf8');
  const input = hash('a') + '|feat(cli): add dry-run preview|\n';

  const result = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fs.readFileSync(changelogPath, 'utf8'), before);
  assert.match(result.stdout, /Add dry-run preview/);
});

test('--insert adds a new section without breaking existing entries', function (t) {
  const changelogPath = makeTempChangelog(t);
  const input = hash('a') + '|feat(release): generate changelog sections|\n';

  const result = runGenerator(baseArgs(changelogPath, ['--insert']), input);
  assert.strictEqual(result.status, 0, result.stderr);

  const after = fs.readFileSync(changelogPath, 'utf8');
  assert.ok(after.indexOf('## [4.0.0-beta.12]') < after.indexOf('## [4.0.0-beta.11]'));
  assert.match(after, /## \[4\.0\.0-beta\.11\] — 2026-04-24 — Existing entry/);
  assert.match(after, /## \[4\.0\.0-beta\.10\] — 2026-04-23 — Older entry/);
  assert.strictEqual((after.match(/## \[4\.0\.0-beta\.12\]/g) || []).length, 1);
});

test('handles commits with no conventional prefix under Other', function (t) {
  const changelogPath = makeTempChangelog(t);
  const input = hash('a') + '|tighten startup path handling|\n';

  const result = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /### 📝 Other\n\n- Tighten startup path handling/);
});

test('skips merge commits and Co-authored-by tail lines', function (t) {
  const changelogPath = makeTempChangelog(t);
  const input = [
    hash('a') + '|Merge pull request #123 from example/topic|',
    hash('b') + '|fix(cli): handle bad input|Body line',
    '',
    'Co-authored-by: Example Person <person@example.com>',
  ].join('\n');

  const result = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Merge pull request/);
  assert.doesNotMatch(result.stdout, /Co-authored-by/);
  assert.match(result.stdout, /- \*\*cli\*\* — Handle bad input/);
});

test('dry-run output is idempotent for the same range', function (t) {
  const changelogPath = makeTempChangelog(t);
  const input = [
    hash('a') + '|feat(cli): add changelog command|',
    hash('b') + '|chore(release): wire publish gate|',
  ].join('\n');

  const first = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);
  const second = runGenerator(baseArgs(changelogPath, ['--dry-run']), input);

  assert.strictEqual(first.status, 0, first.stderr);
  assert.strictEqual(second.status, 0, second.stderr);
  assert.strictEqual(second.stdout, first.stdout);
});
