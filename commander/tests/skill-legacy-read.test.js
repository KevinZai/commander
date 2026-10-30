'use strict';
// Codex P2s on #242: lane-aware skill readers keep reading pre-lane data in ~/.claude/commander.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PLUGINS = ['cowork-plugin', 'cowork-plugin-codex'];

function tmpHome(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-legacy-read-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function knowledgeScript(plugin) {
  const md = fs.readFileSync(path.join(ROOT, plugin, 'skills', 'ccc-knowledge', 'SKILL.md'), 'utf8');
  const m = md.match(/```bash\nnode -e '\n([\s\S]*?)\n' (?:MODE|"?\$?MODE)/) || md.match(/```bash\nnode -e '\n([\s\S]*?)\n'/);
  assert.ok(m, 'query command found in ' + plugin);
  return m[1];
}

for (const plugin of PLUGINS) {
  test(plugin + ' /ccc-knowledge query reads legacy lessons on a non-default lane; lane copy wins', (t) => {
    const home = tmpHome(t);
    const legacy = path.join(home, '.claude', 'commander', 'knowledge');
    const laneDir = path.join(home, '.claude-ai1', 'commander', 'knowledge');
    fs.mkdirSync(legacy, { recursive: true });
    fs.mkdirSync(laneDir, { recursive: true });
    fs.writeFileSync(path.join(legacy, 'kl-1.json'), JSON.stringify({ id: 'kl-1', timestamp: '2026-10-01T00:00:00Z', task: 'old', category: 'web', outcome: 'success' }));
    fs.writeFileSync(path.join(legacy, 'kl-2.json'), JSON.stringify({ id: 'kl-2', timestamp: '2026-10-02T00:00:00Z', task: 'legacy', category: 'api', outcome: 'failed' }));
    fs.writeFileSync(path.join(laneDir, 'kl-2.json'), JSON.stringify({ id: 'kl-2', timestamp: '2026-10-02T00:00:00Z', task: 'lane', category: 'api', outcome: 'success' }));
    const env = { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') };
    const out = execFileSync(process.execPath, ['-e', knowledgeScript(plugin), 'stats'], { env, encoding: 'utf8' });
    const stats = JSON.parse(out.trim());
    assert.equal(stats.lessons, 2);
    assert.deepEqual(stats.outcome, { success: 2 }, 'lane kl-2 (success) shadows legacy kl-2 (failed)');
  });

  test(plugin + ' tune-up probe falls back to the shared update cache when the lane has none', (t) => {
    const probes = fs.readFileSync(path.join(ROOT, plugin, 'skills', 'ccc-tuneup', 'lib', 'tuneup-probes.sh'), 'utf8');
    const skill = fs.readFileSync(path.join(ROOT, plugin, 'skills', 'ccc-tuneup', 'SKILL.md'), 'utf8');
    const line = '[ -f "$CACHE" ] || CACHE="$HOME/.claude/commander/update-cache.json"';
    assert.ok(probes.includes('CACHE="$CCC_STATE/update-cache.json"\n# commander/update-check.js'), 'probe fallback follows the lane path');
    assert.ok(probes.includes(line), 'probe has the legacy fallback');
    assert.ok(skill.includes(line), 'inline SKILL probe has the legacy fallback');
    const home = tmpHome(t);
    fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', 'commander', 'update-cache.json'), JSON.stringify({ timestamp: Date.now(), remoteVersion: '9.9.9' }));
    const sh = 'CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"\nCACHE="$CCC_STATE/update-cache.json"\n' + line + '\nprintf %s "$CACHE"';
    const got = execFileSync('/bin/sh', ['-c', sh], { env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') }, encoding: 'utf8' });
    assert.equal(got, path.join(home, '.claude', 'commander', 'update-cache.json'));
  });
}
