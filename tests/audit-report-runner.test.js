const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');

const runner = path.resolve(__dirname, '../scripts/audit-report.mjs');
const fixture = path.join(__dirname, 'fixtures/audit-report-repo');
const load = () => import(runner);
// Keep synthetic repositories inside the checkout; retain them for inspection.
const cache = path.resolve(__dirname, '../.cache');
fs.mkdirSync(cache, { recursive: true });
const scratch = fs.mkdtempSync(path.join(cache, 'audit-report-'));
const repo = (name) => {
  const dir = path.join(scratch, name);
  fs.cpSync(fixture, dir, { recursive: true });
  return dir;
};
const git = (dir, ...args) => {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: {
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_ALLOW_PROTOCOL: '',
    GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  } });
  assert.equal(result.status, 0, 'synthetic Git operation must succeed');
  return result.stdout.trim();
};
const cli = (...args) => spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8' });
const forbidContents = (t) => {
  t.mock.method(fs, 'readFileSync', () => { throw new Error('Target content read forbidden'); });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
};

test('counts names, languages, manifests and tests without reading target contents', async (t) => {
  const { collectAuditReport } = await load();
  const dir = repo('plain');
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'node_modules/ignored.js'), '');
  fs.symlinkSync(path.join(dir, 'src'), path.join(dir, 'linked'));
  fs.symlinkSync(path.join(dir, 'src/index.js'), path.join(dir, 'linked.js'));
  forbidContents(t);
  const data = collectAuditReport(dir);
  assert.match(data.executiveSummary.join('\n'), /Files inventoried: 5/);
  assert.match(data.executiveSummary.join('\n'), /JavaScript: 2/);
  assert.match(data.executiveSummary.join('\n'), /Python: 1/);
  assert.match(data.executiveSummary.join('\n'), /package.json, service\/pyproject.toml/);
  assert.match(data.executiveSummary.join('\n'), /tests\/index.test.js/);
  assert.match(data.executiveSummary.join('\n'), /committed-file checks not assessed/);
  assert.equal(data.commit, undefined);
  assert.equal(data.scorecard, undefined);
});

test('reports committed environment names, including absent files, without content access', async (t) => {
  const { collectAuditReport } = await load();
  const dir = repo('committed');
  git(dir, '-c', 'init.templateDir=', 'init', '-q');
  for (const name of ['.env', '.env.example', 'service/.env.production']) fs.writeFileSync(path.join(dir, name), '');
  git(dir, 'add', '.');
  git(dir, '-c', 'commit.gpgSign=false', 'commit', '-qm', 'fixture');
  const commit = git(dir, 'rev-parse', 'HEAD');
  fs.renameSync(path.join(dir, 'service/.env.production'), path.join(dir, 'service/archived-environment'));
  fs.writeFileSync(path.join(dir, '.env.local'), '');
  forbidContents(t);
  const data = collectAuditReport(dir);
  assert.equal(data.commit, commit);
  assert.deepEqual(data.review.findings.map((f) => f.location), ['.env', 'service/.env.production']);
  assert.ok(data.review.findings.every((f) => /contents were not read/.test(f.detail)));
  const isolated = spawnSync(process.execPath, [runner, dir, '--out', path.join(scratch, 'isolated.md')], {
    encoding: 'utf8', env: { GIT_DIR: path.join(scratch, 'missing-git') },
  });
  assert.equal(isolated.status, 0, 'ambient Git settings must not redirect the scan');
});

test('renders Markdown with escaped filenames and honest assessment limits', async () => {
  const dir = repo('cli repo');
  fs.writeFileSync(path.join(dir, '<b>|bad.test.js'), '');
  const output = path.join(scratch, 'report.md');
  const result = cli(dir, '--out', output);
  assert.equal(result.status, 0, result.stderr);
  const report = fs.readFileSync(output, 'utf8');
  assert.match(report, /# Project Audit Report/);
  assert.doesNotMatch(report, /\{\{\w+\}\}|<b>/);
  assert.match(report, /&lt;b&gt;\\\|bad.test.js/);
  assert.match(report, /## 2\. Scorecard\n\n_Not assessed_/);
  assert.match(report, /No source or manifest contents were read/);
  assert.doesNotMatch(report, /Automated and manual checks/);
  assert.equal(result.stdout, '');
  assert.equal(cli(dir, '--out', output).status, 1, 'existing reports must not be overwritten');
  const link = path.join(scratch, 'report-link.md');
  fs.symlinkSync(output, link);
  assert.equal(cli(dir, '--out', link).status, 1, 'output symlinks must not be followed');
  assert.equal(fs.readFileSync(output, 'utf8'), report);
});

test('reports missing tests and manifests, and handles an unborn Git repository', async () => {
  const { collectAuditReport } = await load();
  const dir = path.join(scratch, 'empty');
  fs.mkdirSync(dir);
  git(dir, '-c', 'init.templateDir=', 'init', '-q');
  const data = collectAuditReport(dir);
  assert.match(data.executiveSummary.join('\n'), /Files inventoried: 0/);
  assert.match(data.executiveSummary.join('\n'), /No commits/);
  assert.deepEqual(data.review.findings.map((f) => f.title), ['No test files detected', 'No recognized package manifests']);
});

test('rejects invalid input, output and Git metadata without exposing paths', async () => {
  const { collectAuditReport } = await load();
  assert.throws(() => collectAuditReport(path.join(scratch, 'absent')), /Repository path must be an existing directory/);
  assert.throws(() => collectAuditReport(path.join(fixture, 'package.json')), /Repository path must be an existing directory/);
  const broken = repo('broken');
  fs.mkdirSync(path.join(broken, '.git'));
  assert.throws(() => collectAuditReport(broken), /Git metadata could not be inspected/);
  for (const args of [[], [fixture], [fixture, '--wrong', 'x'], [fixture, '--out', path.join(scratch, 'missing/out.md')]]) {
    const result = cli(...args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, new RegExp(scratch));
  }
});
