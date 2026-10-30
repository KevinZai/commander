'use strict';

// CC-1598: /ccc-broadcast routing default (one ops channel), dedup and receipts.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const LIB = path.resolve(__dirname, '..', 'cowork-plugin', 'lib', 'broadcast-route.js');
const {
  DEFAULTS,
  validateConfig,
  routeSignal,
  dedupKey,
  isDuplicate,
  addReceipt,
  defaultConfigPath,
} = require(LIB);

const SIGNALS = Object.keys(DEFAULTS);
const OPS = { channels: ['chat'], chatTarget: '#team', opsChannel: { channel: 'chat', target: '#ops' } };

test('without opsChannel the per-signal table is unchanged', () => {
  const both = { channels: ['chat', 'email'], chatTarget: '#team', emailTo: 'owner@example.com' };
  assert.deepStrictEqual(
    SIGNALS.map((s) => [s, routeSignal(both, s).channel, routeSignal(both, s).audience]),
    [
      ['ship', 'chat', 'team'],
      ['ci', 'chat', 'team'],
      ['task', 'chat', 'owner'],
      ['cost', 'email', 'owner'],
      ['incident', 'chat', 'team'],
      ['digest', 'email', 'owner'],
    ]
  );
  assert.strictEqual(routeSignal(both, 'cost').target, 'owner@example.com');
  assert.strictEqual(routeSignal(both, 'ship').via, 'default');
});

test('opsChannel sends every signal to the one ops channel', () => {
  for (const s of SIGNALS) {
    const r = routeSignal(OPS, s);
    assert.deepStrictEqual([r.channel, r.target, r.via], ['chat', '#ops', 'opsChannel'], s);
  }
  assert.strictEqual(routeSignal(OPS, 'incident').immediate, true, 'incidents stay immediate');
  assert.strictEqual(routeSignal(OPS, 'ship').immediate, false);
});

test('opsChannel never overrides log-only or a channel that is not enabled', () => {
  for (const channels of [[], undefined, ['email']]) {
    const r = routeSignal({ channels, opsChannel: { channel: 'chat', target: '#ops' } }, 'incident');
    assert.deepStrictEqual([r.channel, r.target, r.via], ['log', null, 'opsChannel'], JSON.stringify(channels));
  }
  const email = routeSignal({ channels: ['email'], opsChannel: { channel: 'email', target: 'ops@example.com' } }, 'ship');
  assert.deepStrictEqual([email.channel, email.target], ['email', 'ops@example.com']);
});

test('audience overrides still apply under opsChannel', () => {
  const r = routeSignal({ ...OPS, audiences: { ci: 'owner' } }, 'ci');
  assert.deepStrictEqual([r.audience, r.target], ['owner', '#ops']);
});

test('an unknown signal routes as the digest', () => {
  assert.strictEqual(routeSignal(OPS, 'mystery').signal, 'digest');
  assert.strictEqual(routeSignal({ channels: [] }, '__proto__').signal, 'digest');
});

test('a default channel that is not enabled falls back to the enabled one, then to log-only', () => {
  const chatOnly = { channels: ['chat'], chatTarget: '#team' };
  assert.deepStrictEqual([routeSignal(chatOnly, 'cost').channel, routeSignal(chatOnly, 'cost').target], ['chat', '#team']);
  const none = routeSignal({ channels: [] }, 'ship');
  assert.deepStrictEqual([none.channel, none.target], ['log', null]);
  assert.strictEqual(routeSignal({}, 'ship').channel, 'log', 'missing channels means log-only');
});

test('invalid configs fail clearly', () => {
  const bad = [
    [null, /JSON object/],
    [[], /JSON object/],
    [{ channels: ['sms'] }, /channels/],
    [{ opsChannel: { channel: 'sms', target: '#x' } }, /opsChannel.channel/],
    [{ opsChannel: { channel: 'chat', target: '  ' } }, /opsChannel.target/],
    [{ opsChannel: { channel: 'chat' } }, /opsChannel.target/],
  ];
  for (const [cfg, re] of bad) assert.throws(() => validateConfig(cfg), re, JSON.stringify(cfg));
});

test('a config that holds a credential is refused, even nested', () => {
  assert.throws(() => routeSignal({ channels: ['chat'], slackToken: 'x' }, 'ship'), /credentials.*slackToken/);
  assert.throws(
    () => routeSignal({ opsChannel: { channel: 'chat', target: '#ops', webhookUrl: 'x' } }, 'ship'),
    /opsChannel.webhookUrl/
  );
});

test('dedup keys ignore case and spacing but separate signals', () => {
  assert.strictEqual(dedupKey('ship', 'Checkout  is live'), dedupKey('ship', ' checkout is LIVE '));
  assert.notStrictEqual(dedupKey('ship', 'x'), dedupKey('ci', 'x'));
  assert.match(dedupKey('ship', 'x'), /^[0-9a-f]{16}$/);
});

test('a delivered relay inside the window is a duplicate; outside, failed or future is not', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const key = dedupKey('ship', 'live');
  const at = (h) => new Date(now - h * 3600 * 1000).toISOString();
  assert.strictEqual(isDuplicate([{ key, ok: true, at: at(1) }], key, { now }), true);
  assert.strictEqual(isDuplicate([{ key, ok: true, at: at(25) }], key, { now }), false, 'outside 24h default');
  assert.strictEqual(isDuplicate([{ key, ok: true, at: at(3) }], key, { now, windowHours: 2 }), false);
  assert.strictEqual(isDuplicate([{ key, ok: false, at: at(1) }], key, { now }), false, 'a failed send may retry');
  assert.strictEqual(isDuplicate([{ key, ok: true, at: at(-1) }], key, { now }), false, 'future timestamps ignored');
  assert.strictEqual(isDuplicate([{ key, ok: true, at: 'garbage' }], key, { now }), false);
  assert.strictEqual(isDuplicate(undefined, key, { now }), false);
});

test('receipts keep the message id, cap at 20, and an unconfirmed send is not delivered', () => {
  let recent = [];
  for (let i = 0; i < 25; i++) {
    recent = addReceipt(recent, { signal: 'ci', channel: 'chat', summary: `run ${i}`, ok: true, messageId: `m${i}` });
  }
  assert.strictEqual(recent.length, 20);
  assert.strictEqual(recent[0].messageId, 'm5');
  assert.strictEqual(recent[19].key, dedupKey('ci', 'run 24'));

  const noId = addReceipt([], { signal: 'ship', channel: 'chat', summary: 'live', ok: true });
  assert.deepStrictEqual([noId[0].ok, noId[0].messageId], [false, null]);
  const before = [{ key: 'k' }];
  addReceipt(before, { signal: 'ship', channel: 'chat', summary: 's', ok: true, messageId: 1 });
  assert.strictEqual(before.length, 1, 'input list is not mutated');
});

test('the config path follows CCC_CONFIG_DIR, then CLAUDE_CONFIG_DIR, then ~/.claude', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-bcast-home-'));
  assert.strictEqual(defaultConfigPath({ HOME: home, CCC_CONFIG_DIR: '/x', CLAUDE_CONFIG_DIR: '/y' }), '/x/commander/broadcast.json');
  assert.strictEqual(defaultConfigPath({ HOME: home, CLAUDE_CONFIG_DIR: '/y' }), '/y/commander/broadcast.json');
  assert.strictEqual(defaultConfigPath({ HOME: home }), path.join(home, '.claude', 'commander', 'broadcast.json'));
  const legacy = path.join(home, '.claude', 'commander', 'broadcast.json');
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  fs.writeFileSync(legacy, '{}');
  assert.strictEqual(defaultConfigPath({ HOME: home, CLAUDE_CONFIG_DIR: '/y' }), legacy, 'legacy copy until the lane has its own');
});

test('CLI: route and dedup print JSON; bad input exits 2 with a message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-bcast-cli-'));
  const file = path.join(dir, 'broadcast.json');
  fs.writeFileSync(file, JSON.stringify({ ...OPS, recent: addReceipt([], { signal: 'ship', channel: 'chat', summary: 'Live', ok: true, messageId: 'm1' }) }));
  const route = JSON.parse(execFileSync(process.execPath, [LIB, 'route', 'ci', '--config', file], { encoding: 'utf8' }));
  assert.deepStrictEqual([route.target, route.via], ['#ops', 'opsChannel']);
  const dup = JSON.parse(execFileSync(process.execPath, [LIB, 'dedup', 'ship', 'live', '--config', file], { encoding: 'utf8' }));
  assert.strictEqual(dup.duplicate, true);

  const usage = spawnSync(process.execPath, [LIB, 'dedup', 'ship', '--config', file], { encoding: 'utf8' });
  assert.strictEqual(usage.status, 2);
  assert.match(usage.stderr, /usage:/);
  fs.writeFileSync(file, '{"channels":["chat"],"apiKey":"x"}');
  const cred = spawnSync(process.execPath, [LIB, 'route', 'ship', '--config', file], { encoding: 'utf8' });
  assert.strictEqual(cred.status, 2);
  assert.match(cred.stderr, /credentials/);
  assert.doesNotMatch(cred.stderr + cred.stdout, /"x"/, 'never echoes the value');
});

test('CLI: no config at the default path routes log-only; a missing --config file is an error', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-bcast-empty-'));
  const env = { ...process.env, HOME: home, CCC_CONFIG_DIR: path.join(home, 'lane') };
  const route = JSON.parse(execFileSync(process.execPath, [LIB, 'route', 'incident'], { encoding: 'utf8', env }));
  assert.deepStrictEqual([route.channel, route.target], ['log', null]);
  const dup = JSON.parse(execFileSync(process.execPath, [LIB, 'dedup', 'ship', 'live'], { encoding: 'utf8', env }));
  assert.strictEqual(dup.duplicate, false);
  const missing = spawnSync(process.execPath, [LIB, 'route', 'ship', '--config', path.join(home, 'nope.json')], { encoding: 'utf8', env });
  assert.strictEqual(missing.status, 2);
  assert.match(missing.stderr, /ENOENT/);
});

test('dedup scope separates repos and runs but still catches a retry of the same event', () => {
  assert.notStrictEqual(dedupKey('ci', 'CI green on main.', 'app:run-1'), dedupKey('ci', 'CI green on main.', 'api:run-1'));
  assert.notStrictEqual(dedupKey('ci', 'CI green on main.', 'app:run-1'), dedupKey('ci', 'CI green on main.', 'app:run-2'));
  assert.strictEqual(dedupKey('ci', 'CI green on main.', ' app:run-1 '), dedupKey('ci', 'ci green on main.', 'app:run-1'));
  const recent = addReceipt([], { signal: 'ci', channel: 'chat', summary: 'CI green on main.', scope: 'app:run-1', ok: true, messageId: 'm1' });
  assert.strictEqual(recent[0].key, dedupKey('ci', 'CI green on main.', 'app:run-1'));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-bcast-scope-'));
  const file = path.join(dir, 'broadcast.json');
  fs.writeFileSync(file, JSON.stringify({ ...OPS, recent }));
  const run = (...a) => JSON.parse(execFileSync(process.execPath, [LIB, 'dedup', 'ci', 'CI green on main.', ...a, '--config', file], { encoding: 'utf8' })).duplicate;
  assert.strictEqual(run('--scope', 'app:run-1'), true);
  assert.strictEqual(run('--scope', 'api:run-1'), false);
  const noValue = spawnSync(process.execPath, [LIB, 'dedup', 'ci', 'x', '--scope'], { encoding: 'utf8' });
  assert.strictEqual(noValue.status, 2);
  assert.match(noValue.stderr, /--scope needs a value/);
});
