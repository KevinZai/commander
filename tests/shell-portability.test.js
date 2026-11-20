'use strict';
// Stock macOS ships bash 3.2, which mis-parses a quoted heredoc inside $(...)
// when the heredoc body has an odd number of apostrophes (Codex #302 delta4).
// Keep heredocs out of command substitutions in the shipped shell scripts.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scripts = ['install.sh', 'uninstall.sh', 'install-remote.sh',
  'scripts/reset-commander-install.sh', 'scripts/diagnose-ccc-sources.sh']
  .filter((f) => fs.existsSync(path.join(root, f)));

test('no heredoc starts inside a $(...) command substitution', () => {
  const offenders = [];
  for (const rel of scripts) {
    fs.readFileSync(path.join(root, rel), 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*#/.test(line)) return;
      if (/\$\([^)]*<<-?\s*['"]?[A-Za-z_]+/.test(line)) offenders.push(`${rel}:${i + 1}`);
    });
  }
  assert.deepStrictEqual(offenders, []);
});
