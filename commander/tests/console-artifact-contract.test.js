// v8 (CC-1415, lane A8): every page Commander hands to the Artifact tool
// follows the Artifact page contract — <title> first (the tool scans the first
// 8 KB), no doctype/head/body of its own, every color a token with the
// dark-mode guards, an explicit body background, a >= 16px side gutter, no
// external URLs. The legacy entry points stay byte-identical (the Phase 0
// goldens in console-extraction.test.js pin them); only the publish path opts in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { brandArtifactCss, brandBaseCss } from '../cowork-plugin/lib/brand-css.js';
import { buildDeckHtml, buildTaskRows } from '../cowork-plugin/lib/console-render.js';
import { parseArgs } from '../cowork-plugin/scripts/build-console.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(HERE, '..', 'cowork-plugin');
const BUILD_CONSOLE = path.join(PLUGIN, 'scripts', 'build-console.mjs');
const BOARD_PAGE = path.join(PLUGIN, 'skills', 'ccc-linear-board', 'references', 'board-page.html');
const NOW = '2026-10-13T00:00:00Z';
const TABS = ['overview', 'usage', 'safety', 'memory', 'history'];

function assertContract(html, label) {
  assert.ok(html.startsWith('<title>'), `${label}: <title> is not the first thing in the file`);
  const title = html.slice(0, 8192).match(/<title>([^<]*)<\/title>/)?.[1];
  assert.ok(title, `${label}: no <title> in the first 8 KB`);
  const words = title.replace(/&amp;/g, '&').split(/\s+/).filter((w) => w !== '&');
  assert.ok(words.length >= 2 && words.length <= 4, `${label}: title "${title}" is not 2-4 words`);
  assert.ok(!/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<meta charset/i.test(html), `${label}: ships its own document skeleton`);
  assert.match(html, /:root\s*\{[^}]*--bg:/, `${label}: tokens not on bare :root`);
  assert.match(
    html,
    /@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\)/,
    `${label}: light palette is not guarded against an explicit dark choice`
  );
  assert.ok(html.includes(':root[data-theme="light"]'), `${label}: no explicit light toggle block`);
  assert.ok(!/@media \(prefers-color-scheme: (dark|light)\)\s*\{\s*:root\s*\{/.test(html), `${label}: unguarded theme media block`);
  assert.match(html, /body\{[^}]*background:var\(--bg\)/, `${label}: body has no token background`);
  assert.match(html, /body\{[^}]*padding-inline:16px/, `${label}: no 16px side gutter`);
  assert.ok(!/(src|href)="https?:/i.test(html) && !/@import|url\(\s*['"]?http/i.test(html), `${label}: external resource`);
}

test('brandBaseCss is unchanged; brandArtifactCss carries the same tokens in the guarded shape', () => {
  const legacy = brandBaseCss();
  const contract = brandArtifactCss();
  assert.ok(legacy.includes('@media (prefers-color-scheme: light) {\n  :root {'), 'legacy shape changed');
  assert.ok(contract.includes(':root:not([data-theme="dark"])'));
  assert.ok(!contract.includes(':root[data-theme="dark"]'), 'dark-first page should not need a dark toggle block');
  for (const token of ['--bg: #0F0F0F', '--primary: #FF6B47', '--bg: #F7F6F1', '--primary: #D64A2A']) {
    assert.ok(contract.includes(token), `missing ${token}`);
  }
  // Components are shared verbatim between the two shapes.
  const tail = legacy.slice(legacy.indexOf('.terminal-chrome {'));
  assert.ok(contract.endsWith(tail));
});

for (const tab of TABS) {
  test(`build-console --surface artifact --tab ${tab} meets the page contract`, async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-contract-'));
    const html = execFileSync(
      process.execPath,
      [BUILD_CONSOLE, '--surface', 'artifact', '--tab', tab, '--now', NOW, '--no-recompute'],
      { encoding: 'utf8', env: { ...process.env, HOME: home }, timeout: 60000 }
    );
    assertContract(html, tab);
    assert.ok(!html.includes('<script'), `${tab}: the default publish stays script-free`);
  });
}

test('the default buildDeckHtml stays in the legacy shape (goldens)', () => {
  const html = buildDeckHtml({}, { tab: 'usage', now: NOW });
  assert.ok(html.startsWith('<meta charset="utf-8">'));
  assert.ok(html.includes(brandBaseCss()));
});

test('--db is only accepted for the overview artifact', () => {
  assert.equal(parseArgs(['--surface', 'artifact', '--tab', 'overview', '--db']).db, true);
  assert.throws(() => parseArgs(['--surface', 'artifact', '--tab', 'usage', '--db']), /--db is only valid/);
  assert.throws(() => parseArgs(['--tab', 'overview', '--db']), /--db is only valid/);
  assert.throws(() => parseArgs(['--tab', 'usage', '--emit-rows', 'x.json']), /--emit-rows/);
  assert.throws(
    () => buildDeckHtml({}, { tab: 'usage', artifactContract: true, liveTasks: true }),
    /liveTasks needs/
  );
});

const HOSTILE = '<img src=x onerror=alert(1)>';
const MC_MODEL = {
  generatedAt: NOW,
  tasks: [
    { task_id: 'a/b c', title: HOSTILE, status: 'in_progress', ts: '2026-10-12T10:00:00Z' },
    { task_id: 'a/b c', title: 'duplicate id after sanitizing', status: 'done', ts: '2026-10-12T09:00:00Z' },
    { task_id: '7', title: 'waiting one', status: null, ts: null },
  ],
};

test('liveTasks wraps the baked board and adds one db-reading script', () => {
  const html = buildDeckHtml(MC_MODEL, { tab: 'mission-control', now: NOW, artifactContract: true, liveTasks: true });
  assertContract(html, 'overview --db');
  assert.equal(html.split('<script>').length - 1, 1);
  assert.match(html, /<div data-live="tasks"><div class="board">/, 'baked board is not the resting frame');
  assert.ok(html.includes("window.claude.use('db')"));
  assert.ok(!html.includes('window.claude.db'), 'reads a capability member instead of use()');
  assert.ok(!/innerHTML/.test(html), 'live rows must render through textContent');
  assert.ok(!html.includes(HOSTILE), 'baked task title rendered as markup');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script), 'live script does not parse');
});

test('liveTasks also fills an empty board', () => {
  const html = buildDeckHtml({ generatedAt: NOW }, { tab: 'mission-control', now: NOW, artifactContract: true, liveTasks: true });
  assert.match(html, /<div data-live="tasks"><p class="zero">No tasks tracked yet\.<\/p><\/div>/);
});

test('buildTaskRows emits valid, unique ArtifactData doc ids and one batch at most', () => {
  const { collection, rows, syncedAt } = buildTaskRows(MC_MODEL, { now: NOW });
  assert.equal(collection, 'tasks');
  assert.equal(syncedAt, '2026-10-13T00:00:00.000Z');
  const ids = rows.map((r) => r.doc_id);
  assert.equal(new Set(ids).size, ids.length, 'doc ids collide');
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_\-.~:@+]{1,200}$/);
  assert.deepEqual(rows.map((r) => r.data.bucket), ['inProgress', 'done', 'waiting']);
  assert.equal(rows[0].data.title, HOSTILE, 'rows carry raw text; the page escapes it');
  const many = { tasks: Array.from({ length: 80 }, (_, i) => ({ task_id: String(i), title: `t${i}` })) };
  assert.equal(buildTaskRows(many).rows.length, 50);
});

test('build-console --emit-rows writes the rows file on a bare machine', async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-rows-'));
  const out = path.join(home, 'rows.json');
  execFileSync(
    process.execPath,
    [BUILD_CONSOLE, '--surface', 'artifact', '--tab', 'overview', '--db', '--now', NOW, '--no-recompute',
      '--out', path.join(home, 'page.html'), '--emit-rows', out],
    { encoding: 'utf8', env: { ...process.env, HOME: home }, timeout: 60000 }
  );
  const rows = JSON.parse(await fs.readFile(out, 'utf8'));
  assert.equal(rows.collection, 'tasks');
  assert.deepEqual(rows.rows, []);
  assertContract(await fs.readFile(path.join(home, 'page.html'), 'utf8'), 'overview --db file');
});

test('the Linear board template is data-free, db-driven and contract-shaped', async () => {
  const html = await fs.readFile(BOARD_PAGE, 'utf8');
  assert.ok(html.startsWith('<title>Commander Linear Board</title>'));
  assert.match(html, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.ok(html.includes(':root[data-theme="dark"]'));
  assert.match(html, /body \{[^}]*background: var\(--bg\)/);
  assert.match(html, /body \{[^}]*padding-inline: 16px/);
  assert.ok(html.includes("window.claude.use('db')"));
  assert.ok(!/innerHTML/.test(html));
  assert.ok(!/(src|href)="https?:/i.test(html));
  assert.match(html, /\^https:\\\/\\\/linear\\\.app\\\//, 'card links are not restricted to linear.app');
  assert.doesNotThrow(() => new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]));
});
