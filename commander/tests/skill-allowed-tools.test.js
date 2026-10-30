// `allowed-tools` grants the listed tools WITHOUT a permission prompt during
// the turn that invokes the skill; it does not restrict anything, and
// workspace trust does not gate it (code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill).
// A skill Claude can invoke on its own must therefore not grant bare Bash,
// Write or Edit. KNOWN_DEBT records the grants that existed when this rule
// landed (2026-10-22 best-practice audit); it may only shrink. Scope a grant
// (e.g. `Bash(git status *)`), drop it, or set `disable-model-invocation: true`,
// then delete the entry here.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '..', 'cowork-plugin', 'skills');
const BARE = ['Bash', 'Write', 'Edit'];

const KNOWN_DEBT = {
  "ccc": ["Bash"],
  "ccc-adopt": ["Bash", "Write", "Edit"],
  "ccc-browse": ["Bash"],
  "ccc-build": ["Bash", "Write", "Edit"],
  "ccc-cheatsheet": ["Bash", "Write"],
  "ccc-data": ["Bash", "Write", "Edit"],
  "ccc-design": ["Bash", "Write", "Edit"],
  "ccc-devops": ["Bash", "Write", "Edit"],
  "ccc-doctor": ["Bash"],
  "ccc-fleet": ["Bash", "Write"],
  "ccc-fleet-viz": ["Bash"],
  "ccc-learn": ["Bash"],
  "ccc-makeover": ["Bash", "Write", "Edit"],
  "ccc-marketing": ["Bash", "Write", "Edit"],
  "ccc-mobile": ["Bash", "Write", "Edit"],
  "ccc-more": ["Bash"],
  "ccc-plan": ["Bash", "Write"],
  "ccc-qa": ["Bash", "Write"],
  "ccc-research": ["Bash", "Write"],
  "ccc-review": ["Bash", "Write"],
  "ccc-saas": ["Bash", "Write", "Edit"],
  "ccc-save-session": ["Bash", "Write", "Edit"],
  "ccc-security": ["Bash", "Write", "Edit"],
  "ccc-seo": ["Bash", "Write", "Edit"],
  "ccc-start": ["Bash", "Write"],
  "ccc-suggest": ["Bash"],
  "ccc-systematic-debugging": ["Bash", "Write", "Edit"],
  "ccc-testing": ["Bash"],
  "ccc-tuneup": ["Bash", "Edit"],
  "ccc-update": ["Bash"],
  "ccc-xray": ["Bash"],
};

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

function bareGrants(fm) {
  const m = fm.match(/^allowed-tools:[ \t]*(.*)\n((?:[ \t]+-.*\n?)*)/m);
  if (!m) return [];
  const tools = (m[1] + ' ' + m[2]).split(/[\s,]+/).map((t) => t.replace(/^-$/, '')).filter(Boolean);
  return BARE.filter((t) => tools.includes(t));
}

function modelInvocableGrants() {
  const found = {};
  for (const dir of fs.readdirSync(SKILLS).sort()) {
    const file = path.join(SKILLS, dir, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = frontmatter(fs.readFileSync(file, 'utf8'));
    if (/^disable-model-invocation:\s*true\s*$/m.test(fm)) continue;
    const bare = bareGrants(fm);
    if (bare.length) found[dir] = bare;
  }
  return found;
}

test('no model-invocable skill gains a new bare Bash/Write/Edit grant', () => {
  const found = modelInvocableGrants();
  const added = [];
  for (const [skill, bare] of Object.entries(found)) {
    const allowed = KNOWN_DEBT[skill] || [];
    for (const t of bare) if (!allowed.includes(t)) added.push(`${skill}: ${t}`);
  }
  assert.deepEqual(added, [], 'new unprompted grants on model-invocable skills:\n' + added.join('\n'));
});

test('KNOWN_DEBT has no stale entries (it only shrinks)', () => {
  const found = modelInvocableGrants();
  const stale = [];
  for (const [skill, bare] of Object.entries(KNOWN_DEBT)) {
    for (const t of bare) if (!(found[skill] || []).includes(t)) stale.push(`${skill}: ${t}`);
  }
  assert.deepEqual(stale, [], 'grant removed: delete it from KNOWN_DEBT:\n' + stale.join('\n'));
});
