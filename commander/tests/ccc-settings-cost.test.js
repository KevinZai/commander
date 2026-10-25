'use strict';

// CC-2115: the cost ceiling is off unless set (cost-ceiling-enforcer.js), so
// /ccc-settings must not write a default costCeiling or call it a per-dispatch
// dollar budget.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = fs.readFileSync(path.join(__dirname, '..', 'cowork-plugin', 'skills', 'ccc-settings', 'SKILL.md'), 'utf8');

test('the config file shape has no costCeiling default', () => {
  const block = SKILL.split('File shape')[1].match(/```json\n([\s\S]*?)```/)[1];
  assert.ok(!/costCeiling/.test(block), block);
});

test('the cost ceiling row: off by default, tool-call budget, never a per-dispatch dollar default', () => {
  const row = SKILL.split('\n').find((l) => l.startsWith('| Cost ceiling |'));
  assert.ok(row, 'cost ceiling row present');
  assert.match(row, /🟢 off/);
  assert.match(row, /unset means off/);
  assert.match(row, /tool calls/);
  assert.doesNotMatch(row, /Default \d/);
  assert.doesNotMatch(SKILL, /per dispatch/i);
});
