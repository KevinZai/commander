'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_PLUGIN = path.join(REPO_ROOT, 'commander', 'cowork-plugin');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-directory-mirror.js');

function walk(dir, relative = '') {
  const found = [];
  for (const entry of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
    const rel = path.join(relative, entry.name);
    found.push(rel);
    if (entry.isDirectory()) found.push(...walk(dir, rel));
  }
  return found;
}

function countSkillFiles() {
  return walk(path.join(SOURCE_PLUGIN, 'skills')).filter(
    (rel) => path.basename(rel) === 'SKILL.md'
  ).length;
}

let outDir;
let manifest;
let buildOutput;

test.before(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-directory-mirror-test-'));
  // PATH without `claude` keeps the build hermetic; it must still succeed.
  buildOutput = execFileSync(process.execPath, [BUILD_SCRIPT, '--out', outDir], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: path.dirname(process.execPath) },
  });
  manifest = JSON.parse(fs.readFileSync(path.join(outDir, '.claude-plugin', 'plugin.json'), 'utf8'));
});

test.after(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test('plugin.json sits at the out root with the mirror identity', () => {
  assert.ok(fs.existsSync(path.join(outDir, '.claude-plugin', 'plugin.json')));
  assert.equal(manifest.name, 'cc-commander');
  assert.equal(manifest.displayName, 'CC Commander');
  assert.equal(manifest.repository, 'https://github.com/KevinZai/cc-commander-plugin');
});

test('plugin.json keeps version, author, homepage, license and keywords', () => {
  const source = JSON.parse(
    fs.readFileSync(path.join(SOURCE_PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')
  );
  for (const key of ['version', 'author', 'homepage', 'license']) {
    assert.deepEqual(manifest[key], source[key], key);
  }
  assert.ok(manifest.keywords.length > 0);
  assert.ok(!manifest.keywords.some((k) => /fable/i.test(k)));
});

test('description has no Fable wording and counts match disk', () => {
  assert.doesNotMatch(manifest.description, /fable/i);
  const skills = countSkillFiles();
  const agents = fs.readdirSync(path.join(SOURCE_PLUGIN, 'agents')).filter((f) => f.endsWith('.md')).length;
  const hooks = Object.keys(
    JSON.parse(fs.readFileSync(path.join(SOURCE_PLUGIN, 'hooks', 'hooks.json'), 'utf8')).hooks
  ).length;
  assert.match(manifest.description, new RegExp(`\\b${skills} \`/ccc-\\*\` workflows`));
  assert.match(manifest.description, new RegExp(`\\b${agents} specialist agents`));
  assert.match(manifest.description, new RegExp(`\\b${hooks} lifecycle hooks`));
});

test('LICENSE is the repo MIT license', () => {
  assert.equal(
    fs.readFileSync(path.join(outDir, 'LICENSE'), 'utf8'),
    fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8')
  );
});

test('nested mod manifest is removed but the rest of the mod stays', () => {
  assert.ok(!fs.existsSync(path.join(outDir, 'mods', 'commander-hud', '.claude-plugin', 'plugin.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'mods', 'commander-hud', 'hooks', 'hooks.json')));
});

test('README gets the generated note and rewritten install string', () => {
  const readme = fs.readFileSync(path.join(outDir, 'README.md'), 'utf8');
  assert.ok(
    readme.startsWith(
      '<!-- Generated from KevinZai/commander by scripts/build-directory-mirror.js; do not edit here. -->\n'
    )
  );
  const nonCodex = readme.split('\n').filter((line) => !/codex plugin/.test(line)).join('\n');
  assert.doesNotMatch(nonCodex, /install commander|update commander|commander@commander-hub/);
  assert.match(readme, /cc-commander@claude-community/);
  assert.match(readme, /claude plugin update cc-commander/);
  assert.doesNotMatch(readme, /enter `KevinZai\/commander`/);
  assert.match(readme, /Install CC Commander from the Claude plugin directory \(search `cc-commander`\)/);
  assert.match(readme, /codex plugin marketplace add KevinZai\/commander/);
});

test('excluded paths are not copied', () => {
  const all = walk(outDir);
  assert.ok(!all.some((rel) => rel.split(path.sep).some((part) => part === 'node_modules' || part === 'tests')));
  assert.ok(!all.some((rel) => /(^|\/)\.DS_Store$|\.bak/.test(rel)));
});

test('build prints a summary and tolerates a missing claude binary', () => {
  assert.match(buildOutput, /files copied: \d+/);
  assert.match(buildOutput, /largest file: /);
  assert.match(buildOutput, /skipped `claude plugin validate --strict`/);
  assert.ok(buildOutput.includes(`out: ${fs.realpathSync(outDir)}`));
});

function runBuild(args, { extraPath = '' } = {}) {
  const nodeDir = path.dirname(process.execPath);
  return spawnSync(process.execPath, [BUILD_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: extraPath ? `${extraPath}${path.delimiter}${nodeDir}` : nodeDir },
  });
}

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `cc-directory-mirror-${label}-`));
}

test('--out refuses the repo root, its ancestors and the source plugin dir', () => {
  for (const target of [REPO_ROOT, path.dirname(REPO_ROOT), SOURCE_PLUGIN]) {
    const result = runBuild(['--out', target]);
    assert.notEqual(result.status, 0, target);
    assert.match(result.stderr, /Refusing --out/);
  }
  const dot = runBuild(['--out', '.']);
  assert.notEqual(dot.status, 0);
  assert.match(dot.stderr, /Refusing --out/);
  assert.ok(fs.existsSync(path.join(SOURCE_PLUGIN, '.claude-plugin', 'plugin.json')));
});

test('--out refuses a non-empty directory without the marker and leaves it intact', () => {
  const dir = tempDir('unmarked');
  try {
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'precious');
    const result = runBuild(['--out', dir]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing --out .*no \.cc-commander-mirror marker/);
    assert.equal(fs.readFileSync(path.join(dir, 'keep.txt'), 'utf8'), 'precious');
    assert.deepEqual(fs.readdirSync(dir), ['keep.txt']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--out accepts an empty dir, and a marked dir is rebuilt', () => {
  const empty = tempDir('empty');
  const marked = tempDir('marked');
  try {
    assert.equal(runBuild(['--out', empty]).status, 0);
    assert.ok(fs.existsSync(path.join(empty, '.cc-commander-mirror')));

    fs.writeFileSync(path.join(marked, '.cc-commander-mirror'), 'x');
    fs.writeFileSync(path.join(marked, 'stale.txt'), 'old');
    const result = runBuild(['--out', marked]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!fs.existsSync(path.join(marked, 'stale.txt')));
    assert.ok(fs.existsSync(path.join(marked, '.claude-plugin', 'plugin.json')));
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
    fs.rmSync(marked, { recursive: true, force: true });
  }
});

test('plugin namespace is rewritten to cc-commander: across the tree', () => {
  const stale = /(?<![\w-])commander:(?=[\w<$%*)])/;
  const offenders = walk(outDir).filter((rel) => {
    const abs = path.join(outDir, rel);
    return fs.statSync(abs).isFile() && stale.test(fs.readFileSync(abs, 'utf8'));
  });
  assert.deepEqual(offenders, []);

  const all = walk(outDir)
    .filter((rel) => fs.statSync(path.join(outDir, rel)).isFile())
    .map((rel) => fs.readFileSync(path.join(outDir, rel), 'utf8'))
    .join('\n');
  assert.doesNotMatch(all, /(?<![\w-])(Skill commander:|commander:ccc-|commander:builder)/);

  // Every source file that named commander:ccc-review now names cc-commander:ccc-review.
  const sources = walk(SOURCE_PLUGIN).filter((rel) => {
    const abs = path.join(SOURCE_PLUGIN, rel);
    return fs.statSync(abs).isFile() && /(?<![\w-])commander:ccc-review/.test(fs.readFileSync(abs, 'utf8'));
  });
  assert.ok(sources.length > 0);
  for (const rel of sources) {
    assert.match(fs.readFileSync(path.join(outDir, rel), 'utf8'), /cc-commander:ccc-review/, rel);
  }
  assert.match(
    fs.readFileSync(path.join(outDir, 'hooks', 'lib', 'route-scorer.mjs'), 'utf8'),
    /invoke Skill cc-commander:\$\{top\.id\}/
  );
  // Paths and prose stay untouched.
  assert.match(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8'), /Commander/);
});

// Default builds go to a builder-created temp dir; clean it up from the printed path.
function removeBuiltOut(stdout) {
  const match = /^out: (.+)$/m.exec(stdout);
  if (match && match[1].startsWith(os.tmpdir()) && fs.existsSync(path.join(match[1], '.cc-commander-mirror'))) {
    fs.rmSync(match[1], { recursive: true, force: true });
  }
}

function fakeClaude(exitCode) {
  const bin = tempDir('fakebin');
  const script = path.join(bin, 'claude');
  fs.writeFileSync(
    script,
    `#!/bin/sh\nif [ "$1" = "--version" ]; then echo 0.0.0; exit 0; fi\necho "fake validate output"\nexit ${exitCode}\n`
  );
  fs.chmodSync(script, 0o755);
  return bin;
}

test('a failing `claude plugin validate --strict` fails the build; a passing one does not', () => {
  const failBin = fakeClaude(3);
  const passBin = fakeClaude(0);
  try {
    const failed = runBuild([], { extraPath: failBin });
    removeBuiltOut(failed.stdout);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /claude plugin validate --strict failed \(exit 3\)/);
    assert.match(failed.stdout, /fake validate output/);

    const passed = runBuild([], { extraPath: passBin });
    removeBuiltOut(passed.stdout);
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /claude plugin validate --strict -> exit 0/);
  } finally {
    fs.rmSync(failBin, { recursive: true, force: true });
    fs.rmSync(passBin, { recursive: true, force: true });
  }
});

function readTree(dir) {
  return walk(dir)
    .filter((rel) => fs.statSync(path.join(dir, rel)).isFile())
    .map((rel) => ({ rel, text: fs.readFileSync(path.join(dir, rel), 'utf8') }));
}

// Codex installs ship from the monorepo marketplace, so Codex lines keep the original identity.
function nonCodexLines({ rel, text }) {
  if (rel.startsWith(`skills${path.sep}ccc-codex${path.sep}`)) return [];
  return text.split('\n').filter((line) => !/codex plugin|\.codex\b/i.test(line));
}

test('runtime install identity resolves to cc-commander@claude-community', () => {
  const stale = /commander@commander-hub|commander-hub\/commander/;
  const hits = readTree(outDir).filter((file) => nonCodexLines(file).some((line) => stale.test(line)));
  assert.deepEqual(hits.map((f) => f.rel), []);

  // Desktop/Code install steps must name the directory listing, never add the monorepo marketplace.
  const addMonorepo = /(add from github|add marketplace|marketplace add)\W*`?KevinZai\/commander/i;
  const addHits = readTree(outDir).filter((file) => nonCodexLines(file).some((line) => addMonorepo.test(line)));
  assert.deepEqual(addHits.map((f) => f.rel), []);
  for (const rel of ['skills/ccc-update/references/install-modes.md', 'skills/ccc-doctor/references/fixes.md']) {
    assert.match(fs.readFileSync(path.join(outDir, rel), 'utf8'), /browse the directory for `cc-commander`/, rel);
  }

  const nudge = fs.readFileSync(path.join(outDir, 'hooks', 'update-nudge.js'), 'utf8');
  assert.match(nudge, /const MARKETPLACE = 'claude-community';/);
  assert.match(nudge, /const PLUGIN_ID = 'cc-commander';/);
  assert.match(nudge, /KevinZai\/cc-commander-plugin\/main\/\.claude-plugin\/plugin\.json/);

  const ticker = fs.readFileSync(path.join(outDir, 'hooks', 'suggest-ticker.js'), 'utf8');
  assert.match(ticker, /marketplace update claude-community && claude plugin update cc-commander@claude-community/);

  // The installed-plugin lookups in /ccc-update and /ccc-doctor must match the mirror's key.
  const installedKey = 'cc-commander@claude-community';
  const lookups = [
    ['skills/ccc-update/SKILL.md', /find\(k => k\.startsWith\('([^']+)'\)\)/],
    ['skills/ccc-doctor/SKILL.md', /find\(k=>k\.startsWith\("([^"]+)"\)\)/],
    ['skills/ccc-tuneup/SKILL.md', /find\(k=>k\.startsWith\('([^']+)'\)\)/],
  ];
  for (const [rel, pattern] of lookups) {
    const match = pattern.exec(fs.readFileSync(path.join(outDir, rel), 'utf8'));
    assert.ok(match, `${rel}: installed-plugin lookup not found`);
    assert.ok(installedKey.startsWith(match[1]), `${rel}: prefix ${match[1]} does not match ${installedKey}`);
  }
  for (const rel of ['skills/ccc-update/SKILL.md', 'skills/ccc-doctor/SKILL.md']) {
    const text = fs.readFileSync(path.join(outDir, rel), 'utf8');
    assert.match(text, /"name"\[\[:space:\]\]\*:\[\[:space:\]\]\*"cc-commander"/, rel);
    assert.doesNotMatch(text, /marketplaces\/commander-hub|known_marketplaces\["commander-hub"\]/);
  }
  assert.match(
    fs.readFileSync(path.join(outDir, 'skills', 'ccc-doctor', 'SKILL.md'), 'utf8'),
    /CACHE_ROOT="\$P\/cache\/claude-community\/cc-commander"/
  );
});

test('Codex surfaces keep the monorepo identity', () => {
  const codexSkill = fs.readFileSync(path.join(outDir, 'skills', 'ccc-codex', 'SKILL.md'), 'utf8');
  assert.match(codexSkill, /codex plugin add commander@commander-hub/);
});

// A failed build removes the staging dir it created (and nothing else); a good --out build leaves none.
test('staging temp dir is removed when the build fails and after a successful --out build', (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) return t.skip('root ignores directory permissions');
  const tmpRoot = tempDir('tmproot');
  const out = tempDir('cleanup-out');
  const stagingLeft = () => fs.readdirSync(tmpRoot).filter((name) => name.startsWith('cc-commander-mirror-'));
  const build = () =>
    spawnSync(process.execPath, [BUILD_SCRIPT, '--out', out], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: path.dirname(process.execPath), TMPDIR: tmpRoot },
    });
  try {
    const ok = build();
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(stagingLeft(), [], 'successful --out build leaves no staging dir');

    // The marked out dir is cleared before publishing; a read-only one makes that step fail.
    fs.chmodSync(out, 0o555);
    const failed = build();
    assert.notEqual(failed.status, 0, 'build into a read-only marked dir must fail');
    assert.match(failed.stderr, /build-directory-mirror failed/);
    assert.deepEqual(stagingLeft(), [], 'failed build removed its own staging dir');
    assert.ok(fs.existsSync(out), '--out itself is never removed');
  } finally {
    fs.chmodSync(out, 0o755);
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
