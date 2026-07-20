'use strict';

// Pins the shared Commander decks switcher (deck-switcher.js): every artifact
// gets a top strip listing all decks so users know they exist and can jump.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MOD = pathToFileURL(
  path.join(__dirname, '..', 'cowork-plugin', 'lib', 'deck-switcher.js')
).href;

test('deck registry lists the four Commander artifacts with /ccc-* open commands', async () => {
  const { DECKS } = await import(MOD);
  const ids = DECKS.map((d) => d.id).sort();
  assert.deepStrictEqual(ids, ['cockpit', 'mission-control', 'safety', 'usage']);
  DECKS.forEach((d) => {
    assert.match(d.openCmd, /^\/ccc-/, d.id + ' openCmd');
    assert.ok(d.icon && d.label, d.id + ' has icon + label');
  });
});

test('interactive strip: current deck is highlighted + non-copy, others are copy buttons', async () => {
  const { deckStripHtml } = await import(MOD);
  const html = deckStripHtml('cockpit', { interactive: true });
  assert.ok(html.includes('deck-strip'), 'strip container');
  // current = a <span class="deck-chip current">, NOT a data-copy button
  assert.match(html, /deck-chip current[^>]*>(?:(?!data-copy)[\s\S])*?Cockpit/);
  // the other three are copy buttons carrying their open command
  assert.ok(html.includes('data-copy="/ccc-mission-control"'), 'MC copy');
  assert.ok(html.includes('data-copy="/ccc-usage"'), 'usage copy');
  assert.ok(html.includes('data-copy="/ccc-safety"'), 'safety copy');
  // current deck must not be a copy target
  assert.ok(!/data-copy="\/ccc-browse"/.test(html), 'current deck not copyable');
});

test('static strip (no-JS artifacts like MC): no data-copy anywhere, command shown as text', async () => {
  const { deckStripHtml } = await import(MOD);
  const html = deckStripHtml('mission-control', { interactive: false });
  assert.ok(!html.includes('data-copy'), 'no data-copy in static mode');
  assert.ok(!/<button/.test(html), 'no buttons in static mode');
  // commands still visible so users can type them
  assert.ok(html.includes('/ccc-usage') && html.includes('/ccc-safety'), 'commands visible');
  assert.match(html, /deck-chip current[\s\S]*?Mission Control/);
});

test('no external href/src and values are escaped (CSP-safe)', async () => {
  const { deckStripHtml, deckStripCss } = await import(MOD);
  const html = deckStripHtml('safety', { interactive: true }) + deckStripCss();
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["']?https?:\/\//i, 'no external src/href');
  assert.doesNotMatch(html, /<a\s/i, 'no anchor tags (copy, not navigate)');
  assert.ok(deckStripCss().includes('.deck-strip'), 'css present');
});
