'use strict';

// CC-2115 (AUDIT H4): a skill's `model` / `effort` frontmatter switches the
// session model and effort for the rest of the turn
// (code.claude.com/docs/en/skills), so an Opus or Fable user who opens a menu
// skill silently drops a tier. Plugin skills set neither; `model: inherit`
// (keep the active model) is allowed. A future pin needs a body that justifies
// it and an entry in KEEP.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '..', 'cowork-plugin', 'skills');
const KEEP = {};

test('no plugin skill pins model or effort', () => {
  const pinned = [];
  for (const name of fs.readdirSync(SKILLS).sort()) {
    const file = path.join(SKILLS, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = (fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
    for (const m of fm.matchAll(/^(model|effort):\s*(.*)$/gm)) {
      if (m[1] === 'model' && m[2].trim() === 'inherit') continue;
      if ((KEEP[name] || []).includes(m[1])) continue;
      pinned.push(`${name}: ${m[1]}: ${m[2].trim()}`);
    }
  }
  assert.deepEqual(pinned, []);
});
