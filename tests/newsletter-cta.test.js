'use strict';
// CC-764 slice 1: static accessibility + safety checks for the optional Bible newsletter CTA.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'docs', 'funnel', 'newsletter-cta.html');
const html = fs.readFileSync(FILE, 'utf8');

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function token(block, name) {
  const m = block.match(new RegExp(`--${name}:(#[0-9a-fA-F]{6})`));
  assert.ok(m, `missing token --${name}`);
  return m[1];
}

test('region is labelled and form fields are accessible', () => {
  assert.match(html, /<section[^>]*aria-labelledby="nl-cta-title"/);
  assert.match(html, /<h2 id="nl-cta-title"/);
  assert.match(html, /<label for="nl-cta-email">/);
  assert.match(html, /<input id="nl-cta-email"[^>]*type="email"[^>]*autocomplete="email"[^>]*required/);
  assert.match(html, /<button type="submit">/);
  assert.match(html, /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
});

test('focus is visible and touch targets are at least 44px', () => {
  assert.match(html, /:focus-visible/);
  assert.doesNotMatch(html, /outline:\s*(none|0)/);
  assert.equal((html.match(/min-height:44px/g) || []).length, 2);
});

test('text and button contrast meet WCAG AA in light and dark', () => {
  const [light, dark] = [html.split('@media')[0], html.split('@media')[1]];
  for (const [name, block] of [['light', light], ['dark', dark]]) {
    assert.ok(ratio(token(block, 'nl-fg'), token(block, 'nl-bg')) >= 4.5, `${name} body`);
    assert.ok(ratio(token(block, 'nl-muted'), token(block, 'nl-bg')) >= 4.5, `${name} muted`);
    assert.ok(ratio(token(block, 'nl-accent-fg'), token(block, 'nl-accent')) >= 4.5, `${name} button`);
  }
});

test('stays optional and inert: no gate, no live endpoint, no scripts or third-party loads', () => {
  assert.match(html, /\{\{NEWSLETTER_ACTION_URL\}\}/);
  assert.doesNotMatch(html, /<script|https?:\/\/(?!commanderplugin\.com)/i);
  assert.doesNotMatch(html, /position:\s*(fixed|sticky)|autofocus|aria-modal|role="dialog"/i);
  assert.match(html, /stays free to read without signing up/);
});
