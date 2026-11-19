// The settings template should point editors at the published Claude Code
// settings schema, as the Claude Code settings docs recommend.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('settings.json.template is valid JSON with the Claude Code settings $schema', () => {
  const file = path.join(__dirname, '..', 'settings.json.template');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(json.$schema, 'https://json.schemastore.org/claude-code-settings.json');
});

// H12: the template grants no broad shell commands and registers the guard hooks.
const template = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json.template'), 'utf8'));

test('no broad shell grants', () => {
  const allow = template().permissions.allow;
  const broad = ['node', 'npx', 'curl', 'gh', 'git push', 'git pull', 'git checkout', 'git stash', 'cp', 'mv', 'npm install', 'pnpm install'];
  for (const cmd of broad) {
    assert.ok(!allow.some((a) => a === `Bash(${cmd}:*)` || a === `Bash(${cmd})` || a === `Bash(${cmd} *)`), `${cmd} must not be pre-approved`);
  }
  assert.ok(!allow.includes('Bash') && !allow.includes('Bash(*)'), 'no blanket Bash grant');
});

test('guard hooks registered', () => {
  const pre = template().hooks.PreToolUse;
  assert.ok(Array.isArray(pre));
  const bash = pre.filter((m) => m.matcher === 'Bash').flatMap((m) => m.hooks.map((h) => h.command));
  for (const guard of ['careful-guard', 'confidence-gate']) {
    const f = `$HOME/.claude/hooks/${guard}.js`;
    assert.ok(bash.includes(`if [ -f "${f}" ]; then node "${f}"; fi`), `${guard} is registered with an existence check`);
  }
});
