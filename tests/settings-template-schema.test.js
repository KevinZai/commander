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
