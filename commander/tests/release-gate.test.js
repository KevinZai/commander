'use strict';

// CC-2068 G1-G9: the release gate list, the tag workflow and the release-audit
// workflow stay in line with docs/reports/2026-11-01-ccc-release-gate-audit.md.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const gate = require(path.join(ROOT, 'scripts', 'release-gate.js'));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const RELEASE_YML = read('.github/workflows/release.yml');
const CI_YML = read('.github/workflows/ci.yml');
const PKG = JSON.parse(read('package.json'));
const AUDIT_WF = read('commander/cowork-plugin/workflows/ccc-release-audit.workflow.js');

function fixture(version, changelogHeadings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-gate-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Changelog\n\n' + changelogHeadings.map((h) => `## [${h}] - 2026-11-04\n\n- x\n`).join('\n'));
  return dir;
}

test('G2: tag must equal package.json and the top CHANGELOG entry', () => {
  const dir = fixture('8.1.6', ['8.1.6', '8.1.5']);
  assert.strictEqual(gate.checkTag('v8.1.6', dir).ok, true);
  assert.strictEqual(gate.checkTag('refs/tags/v8.1.6', dir).ok, true);
  const wrongTag = gate.checkTag('v8.1.7', dir);
  assert.strictEqual(wrongTag.ok, false);
  assert.match(wrongTag.problems.join(' '), /tag v8\.1\.7 != package\.json 8\.1\.6/);
});

test('G2: a leftover [Unreleased] section or a stale CHANGELOG fails the tag check', () => {
  assert.strictEqual(gate.checkTag('v8.1.6', fixture('8.1.6', ['Unreleased', '8.1.6'])).ok, false);
  assert.strictEqual(gate.checkTag('v8.1.6', fixture('8.1.6', ['8.1.5'])).ok, false);
});

test('generate-changelog --check-version allows an [Unreleased] section above the release', () => {
  const dir = fixture('8.1.5', ['Unreleased', '8.1.5']);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-changelog.js'), '--check-version',
    '--changelog', path.join(dir, 'CHANGELOG.md'), '--package', path.join(dir, 'package.json')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const bad = fixture('8.1.6', ['Unreleased', '8.1.5']);
  const r2 = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-changelog.js'), '--check-version',
    '--changelog', path.join(bad, 'CHANGELOG.md'), '--package', path.join(bad, 'package.json')], { encoding: 'utf8' });
  assert.strictEqual(r2.status, 1);
});

test('release-gate argument parsing rejects unknown flags and a bare --tag', () => {
  assert.deepStrictEqual(gate.parseArgs(['--tag', 'v1.2.3', '--skip-tests']).tag, 'v1.2.3');
  assert.throws(() => gate.parseArgs(['--tag']), /--tag needs a value/);
  assert.throws(() => gate.parseArgs(['--nope']), /unknown argument/);
});

test('G3/G9: one gate list covers every check, lint, plugin validate and the full suite', () => {
  const ids = gate.GATES.map((g) => g.id);
  for (const id of ['version-parity', 'product-contract', 'audit-counts', 'registry', 'frontmatter', 'fable-contract',
    'doc-sync', 'skill-doc-sync', 'compat', 'changelog-version', 'routes', 'route-eval', 'parity', 'lint',
    'codex-mirror', 'plugin-validate', 'test-ci', 'smoke', 'full-suite']) {
    assert.ok(ids.includes(id), `release-gate.js runs ${id}`);
  }
  assert.strictEqual(new Set(ids).size, ids.length, 'gate ids are unique');
  // Every gate the release-audit workflow runs locally (other than its own grep, the
  // version arg and post-release probes) is also in the CI gate list.
  const gateBlock = AUDIT_WF.slice(AUDIT_WF.indexOf('const READ_ONLY_GATES'), AUDIT_WF.indexOf('if (SKIP_TESTS) log'));
  assert.ok(gateBlock.length > 0, 'found the workflow gate list');
  const wfIds = [...gateBlock.matchAll(/\{ id: '([a-z-]+)'/g)].map((m) => m[1])
    .filter((id) => !['stale-models', 'package-version', 'github-release', 'live-site'].includes(id));
  for (const id of wfIds) assert.ok(ids.includes(id), `workflow gate ${id} is in release-gate.js`);
});

test('G3/G4: release.yml, prepublishOnly and CI all use the one gate script and lint ceiling', () => {
  assert.match(RELEASE_YML, /run: node scripts\/release-gate\.js --tag "\$TAG"/);
  assert.strictEqual(PKG.scripts.prepublishOnly, 'node scripts/release-gate.js');
  assert.match(PKG.scripts.lint, /^eslint \. --max-warnings \d+$/);
  assert.match(CI_YML, /run: npm run lint\b/);
  for (const [name, text] of [['release.yml', RELEASE_YML], ['ci.yml', CI_YML]]) {
    assert.doesNotMatch(text, /--max-warnings/, `${name} has no second lint ceiling`);
  }
  for (const [name, script] of Object.entries(PKG.scripts)) {
    if (name !== 'lint') assert.doesNotMatch(script, /--max-warnings/, `package.json ${name} has no second lint ceiling`);
  }
});

test('G5: every action in release.yml and ci.yml is pinned to a full commit SHA', () => {
  for (const [name, text] of [['release.yml', RELEASE_YML], ['ci.yml', CI_YML]]) {
    const uses = [...text.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.ok(uses.length > 0, `${name} uses actions`);
    for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `${name}: ${u} is pinned by SHA`);
  }
});

test('G6/G7: no npm install, no npm registry, no id-token or packages scope in release.yml', () => {
  assert.doesNotMatch(RELEASE_YML, /npm install/);
  assert.doesNotMatch(CI_YML, /run: npm install/);
  assert.match(RELEASE_YML, /run: npm ci/);
  assert.doesNotMatch(RELEASE_YML, /registry-url/);
  assert.doesNotMatch(RELEASE_YML, /id-token:/);
  assert.doesNotMatch(RELEASE_YML, /packages:/);
  assert.doesNotMatch(RELEASE_YML, /run:.*npm publish/);
});

test('G1: the release-audit stale-model grep excludes the deliberate hits and is clean', () => {
  for (const p of ['commander/cowork-plugin/evals', 'commander/tests/ccc-doctor-diagnostics.test.js', 'commander/tests/codex-models.test.js',
    'commander/tests/evals.test.js', 'dashboard/_archive', 'docs/PROMPT-STANDARD.md', 'docs/reports', 'scripts/check-codex-models.js', 'tasks/spec-*']) {
    assert.ok(AUDIT_WF.includes(`':!${p}'`), `STALE_EXCLUDES has ${p}`);
  }
  if (!fs.existsSync(path.join(ROOT, '.git'))) return;
  const decl = ['STALE', 'STALE_EXCLUDES', 'STALE_MODEL_GREP'].map((n) => AUDIT_WF.match(new RegExp(`const ${n} = .*\\n`))[0]).join('');
  const cmd = new Function(decl + 'return STALE_MODEL_GREP')();
  const r = spawnSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 1, `stale-model grep has no hits on a clean tree:\n${r.stdout}`);
});

test('G8: RUNBOOK and the release checklist describe the tag-only release, not npm', () => {
  const runbook = read('RUNBOOK.md');
  assert.doesNotMatch(runbook, /npm version patch|npm deprecate|npm unpublish|npm info cc-commander/);
  assert.match(runbook, /RELEASE-CHECKLIST\.md/);
  assert.match(read('RELEASE-CHECKLIST.md'), /node scripts\/release-gate\.js --tag v<version>/);
});
