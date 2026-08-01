// v7.4.0 Phase 3 — the four deck skills become "publish just this tab" aliases
// over the console pipeline. Two things have to stay true forever:
//
//   1. URL continuity. An artifact URL is its scratchpad file path, so each deck
//      skill must keep publishing to the path it has always used. A moved path
//      is a silently dead bookmark, which is why the paths are pinned here as
//      literals rather than read from the skill and compared to itself.
//   2. The console banner is OPT-IN. The Phase 0 goldens pin the legacy
//      build*Html() bytes and must never be regenerated, so the banner may only
//      appear when a caller explicitly asks — which the console pipeline does
//      and nothing else may.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildDeckHtml } from '../cowork-plugin/lib/console-render.js';
import { buildSnapshotHtml } from '../cowork-plugin/lib/mission-control-snapshot.js';
import { buildSafetyHtml } from '../cowork-plugin/lib/safety-snapshot.js';
import { buildUsageHtml } from '../cowork-plugin/lib/usage-snapshot.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(HERE, '..', 'cowork-plugin');
const SKILLS = path.join(PLUGIN, 'skills');
const BUILD_CONSOLE = path.join(PLUGIN, 'scripts', 'build-console.mjs');

const NOW = '2026-07-20T12:00:00.000Z';
const BANNER_TEXT = 'Part of <strong>Commander Console</strong>';

// deck skill -> [console tab, the scratchpad path its artifact URL is bound to]
const ALIASES = [
  ['ccc-mission-control', 'overview', 'scratchpad/mission-control-live.html'],
  ['ccc-usage', 'usage', 'scratchpad/ccc-usage-live.html'],
  ['ccc-safety', 'safety', 'scratchpad/ccc-safety-live.html'],
];

async function skillText(name) {
  return fs.readFile(path.join(SKILLS, name, 'SKILL.md'), 'utf8');
}

for (const [skill, tab, outPath] of ALIASES) {
  test(`${skill} publishes tab "${tab}" through build-console.mjs`, async () => {
    const text = await skillText(skill);
    assert.match(text, /scripts\/build-console\.mjs/, `${skill}: no longer routes through the console builder`);
    assert.match(
      text,
      new RegExp(`--surface artifact --tab ${tab}\\b`),
      `${skill}: does not publish the ${tab} tab`
    );
    // The legacy inline `node --input-type=module -e "…build*Html…"` block is
    // gone — two publish paths would be two renderers again.
    assert.ok(
      !/buildSnapshotHtml|buildUsageHtml|buildSafetyHtml/.test(text),
      `${skill}: still carries the pre-console inline renderer`
    );
  });

  test(`${skill} keeps its existing artifact path (${outPath})`, async () => {
    const text = await skillText(skill);
    assert.ok(text.includes(outPath), `${skill}: publish path moved — every existing bookmark would go stale`);
    assert.match(text, new RegExp(`--out ${outPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test(`${skill} points readers at the console`, async () => {
    assert.match(await skillText(skill), /\/ccc-console/, `${skill}: never mentions the all-in-one view`);
  });
}

test('/ccc-console publish absorbs the Cockpit path instead of minting a fifth URL', async () => {
  const text = await skillText('ccc-console');
  // CC-1397: uses the <scratchpad> session-placeholder convention (same as
  // ccc-browse), not a literal cwd-relative "scratchpad/" directory.
  assert.match(text, /--out <scratchpad>\/commander-cockpit\.html/);
  assert.ok(
    !text.includes('scratchpad/commander-console.html') && !text.includes('<scratchpad>/commander-console.html'),
    'ccc-console still writes a fifth, separate artifact path'
  );
  const browse = await skillText('ccc-browse');
  assert.ok(browse.includes('commander-cockpit.html'), 'the Cockpit moved off the shared path');
  assert.match(browse, /\/ccc-console/, 'ccc-browse never mentions the console relationship');
});

test('the console banner is off by default, on when asked, artifact-only', () => {
  const model = { dataThroughMs: Date.parse(NOW), generatedAt: NOW };
  const plain = buildDeckHtml(model, { tab: 'usage', now: NOW });
  const explicitlyOff = buildDeckHtml(model, { tab: 'usage', now: NOW, consoleBanner: false });
  const banner = buildDeckHtml(model, { tab: 'usage', now: NOW, consoleBanner: true });

  assert.equal(plain, explicitlyOff, 'the default is not the same as consoleBanner:false');
  assert.ok(!plain.includes('console-banner'), 'the default render leaked the banner');
  assert.ok(banner.includes(BANNER_TEXT), 'consoleBanner:true did not render the banner');
  assert.equal(banner.split('console-banner"').length - 1, 1, 'the banner rendered more than once');
  assert.match(banner, /\/ccc-console/);
  assert.ok(!banner.includes('<script'), 'the banner introduced a script into a strict-CSP page');
  assert.equal(banner.split('<title>').length - 1, 1, 'the banner broke the single-document contract');
  // Removing just the banner's markup + CSS must give back the default page:
  // the banner is additive, it never re-flows anything else.
  assert.ok(banner.length > plain.length);
});

test('the pre-console entry points stay bannerless (the goldens depend on it)', () => {
  const model = { dataThroughMs: Date.parse(NOW), generatedAt: NOW };
  for (const [name, build] of [
    ['buildSnapshotHtml', buildSnapshotHtml],
    ['buildUsageHtml', buildUsageHtml],
    ['buildSafetyHtml', buildSafetyHtml],
  ]) {
    assert.ok(
      !build(model, { now: NOW }).includes('console-banner'),
      `${name} started emitting the banner — the Phase 0 goldens can no longer pass`
    );
  }
});

test('build-console.mjs --surface artifact emits the banner on a bare machine', async () => {
  // A HOME with no telemetry at all: this is also the zero-state check — the
  // publish path must produce a page, not an error, on a fresh install.
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-deck-alias-'));
  const html = execFileSync(
    process.execPath,
    [BUILD_CONSOLE, '--surface', 'artifact', '--tab', 'safety', '--now', NOW, '--no-recompute'],
    { encoding: 'utf8', env: { ...process.env, HOME: home }, timeout: 60000 }
  );
  assert.ok(html.includes(BANNER_TEXT), 'the published deck page lost its console banner');
  assert.ok(html.includes('<title>Commander Safety</title>'), 'wrong deck rendered for --tab safety');
  assert.ok(!html.includes('<script'), 'published deck page is no longer strict-CSP safe');
});
