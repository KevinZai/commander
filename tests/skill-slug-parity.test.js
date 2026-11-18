'use strict';
// The hosted install hint and the CLI must agree on what a skill name is, or the
// hint advertises names `ccc --skills install` rejects.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const slugOf = (file) => {
  const m = fs.readFileSync(path.join(ROOT, file), 'utf8').match(/SKILL_SLUG = (\/.+\/);/);
  assert.ok(m, `${file} defines SKILL_SLUG`);
  return m[1];
};

test('bin/kc.js and the hosted get-skill hint share one skill-name rule', () => {
  const cli = slugOf('bin/kc.js');
  assert.strictEqual(slugOf('apps/mcp-server-cloud/src/tools/get-skill.ts'), cli);
  const re = new RegExp(cli.slice(1, -1));
  for (const bad of ['--demo', '-demo', '', 'a/b', 'A', 'x'.repeat(65)]) assert.ok(!re.test(bad), bad);
  for (const ok of ['ponytail', 'ccc-design', '3d-pack']) assert.ok(re.test(ok), ok);
});
