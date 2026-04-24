'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

const SKILL_PATH = path.join(
  ROOT,
  'commander',
  'cowork-plugin',
  'skills',
  'ccc-doctor',
  'SKILL.md'
);

test('ccc-doctor SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-doctor SKILL.md frontmatter has required keys — name, description, model', function () {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');

  assert.ok(content.startsWith('---'), 'SKILL.md must begin with --- frontmatter delimiter');

  const endIdx = content.indexOf('---', 3);
  assert.ok(endIdx > 0, 'SKILL.md must have a closing --- for frontmatter');
  const frontmatter = content.slice(3, endIdx);

  assert.ok(frontmatter.includes('name:'), 'Frontmatter must have "name:" key');
  assert.ok(frontmatter.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(frontmatter.includes('model:'), 'Frontmatter must have "model:" key');
});

test('ccc-doctor SKILL.md description is under 500 chars and contains no angle brackets', function () {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');

  const endIdx = content.indexOf('---', 3);
  const frontmatter = content.slice(3, endIdx);

  // Extract description value — handles quoted strings
  const descMatch = frontmatter.match(/description:\s*"([^"]+)"/);
  assert.ok(descMatch, 'description field must be a double-quoted string');

  const desc = descMatch[1];
  assert.ok(desc.length < 500, 'description must be under 500 chars, got: ' + desc.length);
  assert.ok(!/[<>]/.test(desc), 'description must not contain angle brackets (< or >)');
});

test('ccc-doctor SKILL.md body mentions diagnostic or doctor', function () {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const hasKeyword = content.toLowerCase().includes('diagnostic') || content.toLowerCase().includes('doctor');
  assert.ok(hasKeyword, 'SKILL.md body must mention "diagnostic" or "doctor"');
});

test('ccc-doctor SKILL.md model is sonnet and effort is medium', function () {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const endIdx = content.indexOf('---', 3);
  const frontmatter = content.slice(3, endIdx);
  assert.ok(frontmatter.includes('model: sonnet'), 'model must be sonnet');
  assert.ok(frontmatter.includes('effort: medium'), 'effort must be medium');
});
