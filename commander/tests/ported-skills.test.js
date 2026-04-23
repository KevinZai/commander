// Regression gate: ensure ported MIT/Apache-2.0 skills retain license
// attribution in their body (required by both licenses) and pass the
// standard plugin-skill schema contract.
//
// Ported skills (per BLITZ B scan, 2026-04-23):
//   ccc-memory   — adapted from knowledge-work-plugins/productivity (Apache-2.0)
//   ccc-tasks    — adapted from knowledge-work-plugins/productivity (Apache-2.0)
//   ccc-recall   — adapted from thedotmack/claude-mem (MIT)

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_SKILLS = path.join(
  __dirname,
  '..',
  '..',
  'commander',
  'cowork-plugin',
  'skills'
);

const PORTED_SKILLS = [
  { name: 'ccc-memory', license: /Apache-2\.0/i, source: /knowledge-work-plugins/ },
  { name: 'ccc-tasks',  license: /Apache-2\.0/i, source: /knowledge-work-plugins/ },
  { name: 'ccc-recall', license: /MIT/i,         source: /thedotmack\/claude-mem|claude-mem/ },
];

for (const skill of PORTED_SKILLS) {
  test(skill.name + ' SKILL.md exists', function () {
    const p = path.join(PLUGIN_SKILLS, skill.name, 'SKILL.md');
    assert.ok(fs.existsSync(p), skill.name + ' SKILL.md must exist at ' + p);
  });

  test(skill.name + ' frontmatter is well-formed + no angle brackets', function () {
    const content = fs.readFileSync(path.join(PLUGIN_SKILLS, skill.name, 'SKILL.md'), 'utf8');
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, skill.name + ' must have YAML frontmatter');
    const body = fm[1];
    assert.match(body, /name:/, 'frontmatter must have name');
    assert.match(body, /description:/, 'frontmatter must have description');
    assert.match(body, /model:/, 'frontmatter must have model');
    // Description must not contain angle brackets (audit-frontmatter gate)
    const descMatch = body.match(/description:\s*"([^"]+)"/);
    if (descMatch) {
      assert.ok(
        !/[<>]/.test(descMatch[1]),
        skill.name + ' description must not contain < or > (audit-frontmatter gate)'
      );
    }
  });

  test(skill.name + ' body preserves license attribution', function () {
    const content = fs.readFileSync(path.join(PLUGIN_SKILLS, skill.name, 'SKILL.md'), 'utf8');
    assert.match(
      content,
      skill.license,
      skill.name + ' must cite its source license in body (compliance requirement)'
    );
    assert.match(
      content,
      skill.source,
      skill.name + ' must cite its source repo/plugin in body (attribution requirement)'
    );
  });
}

test('plugin.json skill count matches actual directory', function () {
  const pluginJson = path.join(
    __dirname,
    '..',
    '..',
    'commander',
    'cowork-plugin',
    '.claude-plugin',
    'plugin.json'
  );
  const json = JSON.parse(fs.readFileSync(pluginJson, 'utf8'));
  const actual = fs.readdirSync(PLUGIN_SKILLS, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .length;
  const match = json.description.match(/(\d+)\s+plugin skills/);
  assert.ok(match, 'plugin.json description must include a "N plugin skills" count');
  assert.strictEqual(parseInt(match[1], 10), actual, 'claimed vs actual must match');
});
