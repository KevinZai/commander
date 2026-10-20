'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE = path.join(__dirname, '..', '..', 'CLAUDE.md.template');

function confidenceSection() {
  const text = fs.readFileSync(TEMPLATE, 'utf8');
  const match = text.match(/^## Confidence\n([\s\S]*?)(?=^## )/m);
  assert.ok(match, 'CLAUDE.md.template has a "## Confidence" section');
  return match[1];
}

test('confidence section is a HARD RULE', () => {
  assert.match(confidenceSection(), /HARD RULE/);
});

test('confidence section shows the output format', () => {
  const s = confidenceSection();
  assert.match(s, /🎯 Confidence: \d{1,3}% \((high|medium|low)\)/);
  assert.match(s, /⚠️ Low-confidence zones:/);
  assert.match(s, /💡 What I'd double-check:/);
  assert.match(s, /path:line — reason/);
});

test('confidence section states thresholds: <60 red flag, >=85 green', () => {
  const s = confidenceSection();
  assert.match(s, /below 60%/i);
  assert.match(s, /85%/);
  assert.match(s, /high 85-100, medium 60-84, low 0-59/);
});

test('confidence section sends no telemetry', () => {
  assert.doesNotMatch(confidenceSection(), /posthog|telemetry|https?:\/\//i);
});

test('example percentage is within 0-100', () => {
  const m = confidenceSection().match(/Confidence: (\d+)%/);
  assert.ok(m);
  const n = Number(m[1]);
  assert.ok(n >= 0 && n <= 100);
});
