// The v7.4.0 Phase 0 gate. Mission Control, Usage & Cost and Safety each used
// to own a full copy of the deck page; console-render.js now renders all three.
// The ONLY acceptable proof that the extraction changed nothing is that the
// three build*Html() entry points still emit the exact same bytes, so every
// golden under ./fixtures/console-goldens/ was generated from the
// PRE-extraction renderers and is compared here character-for-character.
//
// A failure here is a real regression, NOT a stale fixture: do not regenerate
// the goldens to make this pass (that would compare the new renderer against
// itself and prove nothing). See fixtures/generate-console-goldens.js.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  buildDeckHtml,
  renderMissionControlTab,
  renderSafetyTab,
  renderUsageTab,
} from '../cowork-plugin/lib/console-render.js';
import { buildSnapshotHtml } from '../cowork-plugin/lib/mission-control-snapshot.js';
import { buildSafetyHtml } from '../cowork-plugin/lib/safety-snapshot.js';
import { buildUsageHtml } from '../cowork-plugin/lib/usage-snapshot.js';
import {
  GOLDEN_DIR,
  missionControlCases,
  safetyCases,
  usageCases,
} from './fixtures/console-models.js';

const DECKS = [
  ['mission-control', buildSnapshotHtml, renderMissionControlTab, missionControlCases],
  ['usage', buildUsageHtml, renderUsageTab, usageCases],
  ['safety', buildSafetyHtml, renderSafetyTab, safetyCases],
];

// Byte-for-byte, per deck per case. Compared as strings first so a failure
// prints a readable diff, then as bytes so an invisible encoding change (BOM,
// lone surrogate, CRLF) can't slip through a string comparison that normalized it.
for (const [deck, build, , cases] of DECKS) {
  test(`${deck}: post-extraction HTML is byte-identical to the pre-extraction goldens`, async () => {
    for (const { name, model, now } of await cases()) {
      const golden = await readFile(path.join(GOLDEN_DIR, `${deck}-${name}.html`), 'utf8');
      const actual = build(model, { now });
      assert.equal(actual, golden, `${deck}-${name}.html drifted`);
      assert.ok(
        Buffer.from(actual, 'utf8').equals(Buffer.from(golden, 'utf8')),
        `${deck}-${name}.html differs at the byte level`
      );
    }
  });
}

// The wrappers must be delegations, not a second implementation that happens to
// agree today: buildDeckHtml() called directly with the same tab has to produce
// the identical page.
for (const [deck, build, , cases] of DECKS) {
  test(`${deck}: build*Html delegates to buildDeckHtml for the same tab`, async () => {
    for (const { name, model, now } of await cases()) {
      assert.equal(
        build(model, { now }),
        buildDeckHtml(model, { tab: deck, surface: 'artifact', now }),
        `${deck}-${name} diverged from buildDeckHtml`
      );
    }
  });
}

// Each tab renderer is the section body of its own deck — no chrome, and every
// section it emits is present in the assembled page.
for (const [deck, build, renderTab, cases] of DECKS) {
  test(`${deck}: the tab renderer emits sections only, and the page contains them`, async () => {
    for (const { name, model, now } of await cases()) {
      const tabHtml = renderTab(model, { surface: 'artifact', now });
      const page = build(model, { now });
      assert.ok(!tabHtml.includes('<title>'), `${deck}-${name}: tab leaked page chrome`);
      assert.ok(!tabHtml.includes('terminal-chrome'), `${deck}-${name}: tab leaked terminal chrome`);
      assert.ok(!tabHtml.includes('deck-strip'), `${deck}-${name}: tab leaked the deck strip`);
      assert.ok(page.includes(tabHtml), `${deck}-${name}: page is missing its tab body`);
    }
  });
}

test('buildDeckHtml rejects an unknown tab and the unbuilt widget surface', () => {
  assert.throws(() => buildDeckHtml({}, { tab: 'memory' }), /unknown tab/);
  assert.throws(
    () => buildDeckHtml({}, { tab: 'usage', surface: 'widget' }),
    /not implemented yet/
  );
});
