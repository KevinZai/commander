// AskUserQuestion pickers in skills must fit the tool schema:
// `header` is "Short label for the question (max 12 characters)", options are
// label/description/preview, and free text is built in (no autocomplete/value).
// Source: code.claude.com/docs/en/agent-sdk/user-input#question-format
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '..', 'cowork-plugin', 'skills');
const HEADER_MAX = 12;

function skillFiles() {
  return fs.readdirSync(SKILLS)
    .map((d) => path.join(SKILLS, d, 'SKILL.md'))
    .filter((p) => fs.existsSync(p));
}

test('every AskUserQuestion header in a skill is at most 12 characters', () => {
  const offenders = [];
  for (const file of skillFiles()) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const re = /header:? "([^"]*)"/g;
      let m;
      while ((m = re.exec(line))) {
        if ([...m[1]].length > HEADER_MAX) {
          offenders.push(`${path.relative(SKILLS, file)}:${i + 1} "${m[1]}"`);
        }
      }
    });
  }
  assert.deepEqual(offenders, [], 'headers over 12 characters:\n' + offenders.join('\n'));
});

test('skill pickers use only AskUserQuestion schema fields', () => {
  const offenders = [];
  for (const file of skillFiles()) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*autocomplete:/.test(line) || /^\s{4}value: "/.test(line)) {
        offenders.push(`${path.relative(SKILLS, file)}:${i + 1} ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [], 'non-schema picker fields:\n' + offenders.join('\n'));
});
