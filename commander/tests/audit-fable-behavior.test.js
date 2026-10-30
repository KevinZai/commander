'use strict';

// CC-1360 F9: the doctrine gate checked only the Fable contract footer, which
// itself says "verifier ≠ worker", so every skill passed whatever its body did.
// This test reads the body (footer excluded): a skill that may both dispatch
// agents (Agent/Task/Workflow) and write files (Write/Edit/NotebookEdit) must
// carry a verification step of its own, or be listed below with the reason its
// dispatched agents have no write effects.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'skills');

const DISPATCH_TOOLS = ['Agent', 'Task', 'Workflow'];
const WRITE_TOOLS = ['Write', 'Edit', 'NotebookEdit'];

const VERIFY_RE = new RegExp([
  '\\bverif(?:y|ies|ied|ication|ier|iers)\\b',
  'independent(?:ly)? (?:review|check)',
  'fresh[- ]context',
  'other than (?:its|the) worker',
  '\\brefute\\b',
  '(?:checked|reviewed) [^.\\n]{0,60}by the lead',
].join('|'), 'i');

// Dispatching skills whose agents only report; the lead does any writing.
const REPORT_ONLY_DISPATCH = {
  'ccc-e2e': 'workers are audit only ("they do not fix"); the lead writes the verdict file',
  'ccc-qa': 'the qa-engineer agent returns an analysis report; fixes go through a later picker',
};

function readSkill(name) {
  const text = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const front = fm ? fm[1] : '';
  const toolsBlock = /allowed-tools:\n((?:\s+-\s+.*\n?)*)/.exec(front);
  const tools = toolsBlock ? toolsBlock[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
  const body = (fm ? text.slice(fm[0].length) : text)
    .split('\n')
    .filter((l) => !l.includes('**Fable contract:**'))
    .join('\n');
  return { tools, body };
}

function writeDispatchingSkills() {
  return fs.readdirSync(SKILLS_DIR)
    .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
    .filter((d) => {
      const { tools } = readSkill(d);
      return tools.some((t) => DISPATCH_TOOLS.includes(t)) && tools.some((t) => WRITE_TOOLS.includes(t));
    })
    .sort();
}

test('the Fable contract footer alone does not count as a verification step', function () {
  const footer = '> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`';
  const stripped = footer.split('\n').filter((l) => !l.includes('**Fable contract:**')).join('\n');
  assert.strictEqual(VERIFY_RE.test(stripped), false);
  assert.strictEqual(VERIFY_RE.test(footer), true, 'the footer would satisfy the check if it were not stripped');
});

test('there are write-dispatching skills to check', function () {
  assert.ok(writeDispatchingSkills().length >= 10, 'expected the skill scan to find dispatching skills');
});

test('every write-dispatching skill carries its own verification step', function () {
  const missing = writeDispatchingSkills()
    .filter((d) => !(d in REPORT_ONLY_DISPATCH))
    .filter((d) => !VERIFY_RE.test(readSkill(d).body));
  assert.deepStrictEqual(missing, [], 'add a verification step (or a report-only reason) to: ' + missing.join(', '));
});

test('report-only allowlist entries are current', function () {
  const live = writeDispatchingSkills();
  for (const [name, reason] of Object.entries(REPORT_ONLY_DISPATCH)) {
    assert.ok(live.includes(name), name + ' is no longer a write-dispatching skill; drop it from the allowlist');
    assert.ok(reason.length > 20, name + ' needs a reason');
  }
});
