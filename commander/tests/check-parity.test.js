'use strict';

// CC-365: tests for scripts/check-parity.js (read-only CLI/Plugin parity checker).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO, 'scripts', 'check-parity.js');
const { runParity } = require(SCRIPT);

function write(root, rel, content) {
  const f = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

const ALLOW = {
  skills: { diverged_shared: {} },
  hooks: { external_script_registries: { 'hooks/hooks.json': 'ecc' }, codex_dropped_events: {}, diverged_scripts: {} },
  versions: { independent_manifests: {} },
};

function hook(cmd) { return [{ hooks: [{ type: 'command', command: cmd }] }]; }
const PLUGIN_ONE = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/one.js"';

// Minimal consistent fixture repo at version 1.0.0.
function fixture(mutate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-parity-'));
  const v = '1.0.0';
  write(root, 'package.json', { name: 'x', version: v });
  write(root, 'commander/contract.json', { version: v });
  write(root, 'commander/branding.js', "const _pkg = require('../package.json');\nmodule.exports = { version: _pkg.version };\n");
  write(root, 'commander/cowork-plugin/.claude-plugin/plugin.json', { name: 'commander', version: v });
  write(root, '.claude-plugin/marketplace.json', { version: v, plugins: [{ name: 'commander', version: v }] });
  write(root, '.agents/plugins/marketplace.json', { version: v, plugins: [{ name: 'commander', version: v }] });
  write(root, 'commander/cowork-plugin-codex/.codex-plugin/plugin.json', { version: v });
  write(root, 'commander/cowork-plugin/skills/ccc-a/SKILL.md', 'a');
  write(root, 'skills/ccc-a/SKILL.md', 'a');
  write(root, 'skills/other/SKILL.md', 'o');
  write(root, 'commander/cowork-plugin/hooks/one.js', '');
  write(root, 'commander/cowork-plugin-codex/hooks/one.js', '');
  write(root, 'hooks/careful.js', '');
  write(root, 'commander/cowork-plugin/hooks/hooks.json', { hooks: { SessionStart: hook(PLUGIN_ONE) } });
  write(root, 'commander/cowork-plugin-codex/hooks.json', { hooks: { SessionStart: hook(PLUGIN_ONE) } });
  write(root, 'hooks/hooks-standalone.json', { hooks: { PreToolUse: hook('node ~/.claude/hooks/careful.js') } });
  write(root, 'hooks/hooks.json', { hooks: { PreToolUse: hook('node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/ecc.js"') } });
  write(root, 'scripts/parity-allowlist.json', ALLOW);
  if (mutate) mutate(root);
  return root;
}

test('real repo: no hard parity findings today', () => {
  const r = runParity(REPO);
  assert.deepStrictEqual(r.findings, []);
  assert.strictEqual(r.versions.ssot, JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version);
});

test('real repo: --check exits 0 and --json is parseable', () => {
  const c = spawnSync(process.execPath, [SCRIPT, '--check'], { cwd: REPO, encoding: 'utf8' });
  assert.strictEqual(c.status, 0, c.stderr + c.stdout);
  const j = spawnSync(process.execPath, [SCRIPT, '--json'], { cwd: REPO, encoding: 'utf8' });
  const parsed = JSON.parse(j.stdout);
  assert.ok(parsed.skills.plugin_count > 0);
  assert.strictEqual(Object.keys(parsed.hooks.registries).length, 4);
});

test('checker is read-only: tree is unchanged after a run', () => {
  const root = fixture();
  const snap = () => JSON.stringify(fs.readdirSync(root, { recursive: true }).sort());
  const before = snap();
  runParity(root);
  assert.strictEqual(snap(), before);
});

test('fixture baseline is clean', () => {
  const r = runParity(fixture());
  assert.deepStrictEqual(r.findings, []);
  assert.strictEqual(r.skills.shared, 1);
  assert.deepStrictEqual(r.skills.identical_shared, ['ccc-a']);
});

test('version drift in plugin.json is a hard finding', () => {
  const root = fixture((r) => write(r, 'commander/cowork-plugin/.claude-plugin/plugin.json', { version: '0.9.0' }));
  assert.ok(runParity(root).findings.some((f) => /version drift: commander\/cowork-plugin\/\.claude-plugin\/plugin\.json/.test(f)));
});

test('version drift in marketplace plugins[] entry is a hard finding', () => {
  const root = fixture((r) => write(r, '.claude-plugin/marketplace.json', { version: '1.0.0', plugins: [{ name: 'commander', version: '0.0.1' }] }));
  assert.ok(runParity(root).findings.some((f) => /plugins\[commander\]/.test(f)));
});

test('hardcoded CLI version in branding.js is a hard finding', () => {
  const root = fixture((r) => write(r, 'commander/branding.js', "module.exports = { version: '1.0.0' };\n"));
  assert.ok(runParity(root).findings.some((f) => /branding\.js/.test(f)));
});

test('unregistered version-bearing manifest is a warning, not a failure', () => {
  const root = fixture((r) => write(r, 'newapp/package.json', { version: '3.0.0' }));
  const r = runParity(root);
  assert.deepStrictEqual(r.findings, []);
  assert.ok(r.warnings.some((w) => /newapp\/package\.json/.test(w)));
});

test('diverged shared skill fails unless allowlisted; allowlist goes stale when fixed', () => {
  const root = fixture((r) => write(r, 'skills/ccc-a/SKILL.md', 'different'));
  assert.ok(runParity(root).findings.some((f) => /ccc-a/.test(f)));

  write(root, 'scripts/parity-allowlist.json', Object.assign({}, ALLOW, {
    skills: { diverged_shared: { 'ccc-a': { canonical: 'plugin', reason: 'known' } } },
  }));
  assert.deepStrictEqual(runParity(root).findings, []);

  write(root, 'skills/ccc-a/SKILL.md', 'a');
  assert.ok(runParity(root).warnings.some((w) => /stale allowlist entry ccc-a/.test(w)));
});

test('diverged skill allowlist entry must name a canonical side and a reason', () => {
  const root = fixture((r) => write(r, 'skills/ccc-a/SKILL.md', 'different'));
  const withEntry = (entry) => write(root, 'scripts/parity-allowlist.json',
    Object.assign({}, ALLOW, { skills: { diverged_shared: { 'ccc-a': entry } } }));

  // legacy bare-string entry has no canonical side
  withEntry('known');
  assert.ok(runParity(root).findings.some((f) => /ccc-a.*canonical/.test(f)));
  withEntry({ canonical: 'both', reason: 'x' });
  assert.ok(runParity(root).findings.some((f) => /ccc-a.*canonical/.test(f)));
  withEntry({ canonical: 'cli' });
  assert.ok(runParity(root).findings.some((f) => /ccc-a.*reason/.test(f)));

  withEntry({ canonical: 'cli', reason: 'cli copy is the maintained one' });
  const r = runParity(root);
  assert.deepStrictEqual(r.findings, []);
  assert.deepStrictEqual(r.skills.canonical, { 'ccc-a': { side: 'cli', reason: 'cli copy is the maintained one' } });
});

test('report prints the canonical side of every diverged skill router', () => {
  const root = fixture((r) => {
    write(r, 'skills/ccc-a/SKILL.md', 'different');
    write(r, 'scripts/parity-allowlist.json', Object.assign({}, ALLOW, {
      skills: { diverged_shared: { 'ccc-a': { canonical: 'plugin', reason: 'ships in the Desktop plugin' } } },
    }));
  });
  const out = require(SCRIPT).render(runParity(root));
  assert.match(out, /ccc-a\s+canonical: plugin\s+ships in the Desktop plugin/);
});

test('plugin-only and CLI-only skills are reported but not failures', () => {
  const root = fixture((r) => write(r, 'commander/cowork-plugin/skills/ccc-b/SKILL.md', 'b'));
  const r = runParity(root);
  assert.deepStrictEqual(r.findings, []);
  assert.strictEqual(r.skills.plugin_only, 1);
  assert.strictEqual(r.skills.cli_only, 1);
  assert.strictEqual(r.skills.sets_identical, false);
});

test('plugin hook referencing a missing script is a hard finding', () => {
  const root = fixture((r) => fs.rmSync(path.join(r, 'commander', 'cowork-plugin', 'hooks', 'one.js')));
  assert.ok(runParity(root).findings.some((f) => /does not exist \(SessionStart: hooks\/one\.js\)/.test(f)));
});

test('standalone hook referencing a missing script is a hard finding', () => {
  const root = fixture((r) => fs.rmSync(path.join(r, 'hooks', 'careful.js')));
  assert.ok(runParity(root).findings.some((f) => /hooks-standalone\.json/.test(f)));
});

test('codex registry out of sync with the plugin registry is a hard finding', () => {
  const root = fixture((r) => {
    write(r, 'commander/cowork-plugin-codex/hooks/two.js', '');
    write(r, 'commander/cowork-plugin-codex/hooks.json', {
      hooks: { SessionStart: hook(PLUGIN_ONE).concat(hook('node "${CLAUDE_PLUGIN_ROOT}/hooks/two.js"')) },
    });
  });
  assert.ok(runParity(root).findings.some((f) => /out of sync/.test(f)));
});

test('codex registry dropping an event is allowed only when allowlisted', () => {
  const root = fixture((r) => write(r, 'commander/cowork-plugin/hooks/hooks.json', {
    hooks: { SessionStart: hook(PLUGIN_ONE), Notification: hook(PLUGIN_ONE) },
  }));
  assert.ok(runParity(root).findings.some((f) => /drops event Notification/.test(f)));

  const allow = JSON.parse(JSON.stringify(ALLOW));
  allow.hooks.codex_dropped_events = { Notification: 'no codex equivalent' };
  write(root, 'scripts/parity-allowlist.json', allow);
  assert.deepStrictEqual(runParity(root).findings, []);
});

test('missing registry file is a hard finding', () => {
  const root = fixture((r) => fs.rmSync(path.join(r, 'hooks', 'hooks-standalone.json')));
  assert.ok(runParity(root).findings.some((f) => /hooks-standalone\.json is missing/.test(f)));
});

// ─── diverged hook scripts: canonical side + pinned content ──────────────────

const sha256 = (txt) => require('crypto').createHash('sha256').update(txt).digest('hex');

function hookFixture(cliBody, pluginBody, entry) {
  return fixture((r) => {
    write(r, 'hooks/one.js', cliBody);
    write(r, 'hooks/hooks-standalone.json', { hooks: { PreToolUse: hook('node ~/.claude/hooks/one.js') } });
    write(r, 'commander/cowork-plugin/hooks/one.js', pluginBody);
    const allow = JSON.parse(JSON.stringify(ALLOW));
    if (entry) allow.hooks.diverged_scripts = { 'one.js': entry };
    write(r, 'scripts/parity-allowlist.json', allow);
  });
}

test('same-named hook script with different content is a hard finding unless allowlisted', () => {
  const root = hookFixture('cli', 'plugin');
  assert.ok(runParity(root).findings.some((f) => /one\.js.*diverged.*not allowlisted/.test(f)));
});

test('identical same-named hook scripts are clean and an allowlist entry for them is stale', () => {
  assert.deepStrictEqual(runParity(hookFixture('same', 'same')).findings, []);
  const root = hookFixture('same', 'same', {
    canonical: 'plugin', reason: 'r', pinned_sha256: { cli: sha256('same'), plugin: sha256('same') },
  });
  assert.ok(runParity(root).warnings.some((w) => /stale allowlist entry hooks\.diverged_scripts\.one\.js/.test(w)));
});

test('allowlisted diverged hook must name a canonical side, a reason and pins for both copies', () => {
  const pins = { cli: sha256('cli'), plugin: sha256('plugin') };
  const f = (entry) => runParity(hookFixture('cli', 'plugin', entry)).findings.join('\n');
  assert.match(f({ reason: 'r', pinned_sha256: pins }), /one\.js.*canonical/);
  assert.match(f({ canonical: 'plugin', pinned_sha256: pins }), /one\.js.*reason/);
  assert.match(f({ canonical: 'plugin', reason: 'r' }), /one\.js.*pinned_sha256/);
  assert.strictEqual(f({ canonical: 'plugin', reason: 'r', pinned_sha256: pins }), '');
});

test('editing either diverged hook copy without updating the pin is a hard finding', () => {
  const entry = { canonical: 'plugin', reason: 'r', pinned_sha256: { cli: sha256('cli'), plugin: sha256('plugin') } };
  const root = hookFixture('cli', 'plugin', entry);
  assert.deepStrictEqual(runParity(root).findings, []);

  write(root, 'hooks/one.js', 'cli edited');
  const a = runParity(root).findings.join('\n');
  assert.match(a, /one\.js.*cli copy changed/);
  assert.doesNotMatch(a, /plugin copy changed/);

  write(root, 'hooks/one.js', 'cli');
  write(root, 'commander/cowork-plugin/hooks/one.js', 'plugin edited');
  const b = runParity(root).findings.join('\n');
  assert.match(b, /one\.js.*plugin copy changed/);
  assert.match(b, new RegExp(sha256('plugin edited')));
});

test('real repo: context-guard.js and pre-compact.js are pinned diverged copies with a canonical side', () => {
  const r = runParity(REPO);
  const allow = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'parity-allowlist.json'), 'utf8'));
  for (const name of ['context-guard.js', 'pre-compact.js']) {
    const e = allow.hooks.diverged_scripts[name];
    assert.ok(e && ['cli', 'plugin'].includes(e.canonical) && e.reason, name + ' needs canonical + reason');
    const row = r.hooks.shared_script_names.find((x) => x.script === name);
    assert.ok(row && row.identical === false && row.canonical === e.canonical, name);
  }
});

test('real repo: every diverged skill router records a canonical side and reason', () => {
  const r = runParity(REPO);
  assert.strictEqual(r.skills.diverged_shared.length, 12);
  for (const n of r.skills.diverged_shared) {
    const c = r.skills.canonical[n];
    assert.ok(c && ['cli', 'plugin'].includes(c.side) && c.reason, n);
  }
});
