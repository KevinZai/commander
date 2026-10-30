'use strict';
// CC-2101: the non-TTY `ccc` menu printed separators as "undefined" items and
// numbered entries by position. Every entry needs a label, a unique key and a handler.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const tui = require('../tui.js');
const adventure = require('../adventure.js');

const ROOT = path.join(__dirname, '..', '..');
const ACTIONS_DIR = path.join(__dirname, '..', 'actions');
const BUILTIN_ACTIONS = ['quit', 'back'];

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// The same mapping engine.runAdventure hands to tui.select.
function menuItems(choices) {
  return choices.map(function(ch) {
    if (ch.separator) return { separator: true };
    return { label: ch.label, description: ch.description || '', key: ch.key, action: ch.action, next: ch.next };
  });
}

function actionNames() {
  const names = new Set(BUILTIN_ACTIONS);
  fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.js')).forEach((f) => {
    Object.keys(require(path.join(ACTIONS_DIR, f))).forEach((k) => names.add(k));
  });
  return names;
}

function mainMenu(state) {
  const adv = adventure.loadAdventure('main-menu');
  return adventure.prepareAdventure(adv, state, {});
}

const STATES = {
  minimal: { activeSession: null, user: { name: 'Test' } },
  full: { activeSession: { task: 'x' }, user: { name: 'Test' }, linear: { apiKey: 'set' } },
};

for (const [name, state] of Object.entries(STATES)) {
  test('main menu non-TTY render (' + name + ' state): no undefined, unique keys, every entry has a handler', () => {
    const prepared = mainMenu(state);
    const items = menuItems(prepared.choices);
    const menu = tui.renderFallbackMenu(items, prepared.prompt);
    const text = stripAnsi(menu.text);
    const actions = actionNames();

    assert.doesNotMatch(text, /undefined/);
    const keys = menu.keys.filter((k) => k !== null);
    assert.equal(new Set(keys).size, keys.length, 'keys are unique');
    items.forEach((item, i) => {
      if (item.separator) {
        assert.equal(menu.keys[i], null, 'a separator is not selectable');
        return;
      }
      assert.ok(menu.keys[i], 'entry ' + item.label + ' has a key');
      assert.ok(item.label, 'entry at ' + i + ' has a label');
      assert.match(text, new RegExp('^    ' + menu.keys[i].replace(/[/]/g, '\\/') + '\\) ' + item.label.replace(/[&]/g, '\\&'), 'm'));
      const hasNext = typeof item.next === 'string' && (adventure.loadAdventure(item.next) !== null);
      const hasAction = typeof item.action === 'string' && actions.has(item.action);
      assert.ok(hasNext || hasAction, 'entry ' + item.label + ' maps to a handler (next=' + item.next + ', action=' + item.action + ')');
      assert.equal(menu.indexOf(menu.keys[i]), i, 'typing ' + menu.keys[i] + ' selects ' + item.label);
    });
  });
}

test('the non-TTY menu uses the keys declared in main-menu.json', () => {
  const prepared = mainMenu(STATES.minimal);
  const items = menuItems(prepared.choices);
  const menu = tui.renderFallbackMenu(items, prepared.prompt);
  items.forEach((item, i) => {
    if (!item.separator && item.key) assert.equal(menu.keys[i], item.key);
  });
  assert.equal(items[menu.indexOf('q')].action, 'quit');
  assert.equal(menu.indexOf('zz'), -1);
  assert.equal(menu.indexOf(''), -1);
});

test('fallbackKeys: duplicates and missing keys get the next free letter; separators get none', () => {
  const keys = tui.fallbackKeys([
    { label: 'A', key: 'b' },
    { separator: true },
    { label: 'B', key: 'b' },
    { label: 'C' },
    'D',
  ]);
  assert.deepEqual(keys, ['b', null, 'a', 'c', 'd']);
});

test('`ccc` with no args on a non-TTY exits cleanly', (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-menu-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const env = { PATH: process.env.PATH, HOME: home, CCC_TELEMETRY: '0', NO_COLOR: '1' };
  // First run asks for a name; mark onboarding done so the main menu renders.
  const dir = path.join(home, '.claude', 'commander');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ firstRun: false, user: { name: 'T', level: 'power' } }));

  const closed = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'kc.js')], { env, cwd: home, input: '', encoding: 'utf8', timeout: 20000 });
  assert.equal(closed.status, 0, closed.stderr);
  assert.doesNotMatch(stripAnsi(closed.stdout), /undefined/);
  assert.match(stripAnsi(closed.stdout), /^ {4}q\) Quit/m);

  const quit = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'kc.js')], { env, cwd: home, input: 'q\n', encoding: 'utf8', timeout: 20000 });
  assert.equal(quit.status, 0, quit.stderr);
});

test('fallbackKeys: long lists stay selectable after z (numbers)', () => {
  const items = [];
  for (let i = 0; i < 40; i++) items.push({ label: 'Team ' + i });
  items.splice(3, 0, { label: 'Declared one', key: '1' });
  const menu = tui.renderFallbackMenu(items, 'Pick a team');
  assert.equal(menu.keys.filter((k) => k === null).length, 0, 'every entry has a key');
  assert.equal(new Set(menu.keys).size, menu.keys.length, 'keys are unique');
  assert.equal(menu.keys[3], '1', 'declared key kept');
  assert.equal(menu.keys[26], 'z');
  assert.equal(menu.keys[27], '2', 'numbers skip the declared "1"');
  assert.equal(menu.indexOf('2'), 27);
  assert.equal(menu.indexOf(' ' + menu.keys[40] + ' '), 40);
  assert.match(stripAnsi(menu.text), /^ {4}2\) Team 26$/m);
});
