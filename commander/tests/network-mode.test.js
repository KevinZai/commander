'use strict';

// ============================================================================
// CC-2111 — network mode: telemetry opt-in, CCC_OFFLINE, CCC_CI_TICKER,
// no partner promos in hooks / status line, neutral ccc-connect catalog.
// Every outbound call is stubbed; nothing here touches the network.
// Run: node --test commander/tests/network-mode.test.js
// ============================================================================

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const nm = require('../cowork-plugin/lib/network-mode.js');

let TMP;
before(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-network-mode-')); });
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ok */ } });

/** Fresh $HOME, optionally with ~/.commander/config.json holding `config` (object or raw string). */
function makeHome(config) {
  const home = fs.mkdtempSync(path.join(TMP, 'home-'));
  if (config !== undefined) {
    fs.mkdirSync(path.join(home, '.commander'), { recursive: true });
    fs.writeFileSync(
      path.join(home, '.commander', 'config.json'),
      typeof config === 'string' ? config : JSON.stringify(config)
    );
  }
  return home;
}

function cleanEnv(extra) {
  const env = { ...process.env, ...extra };
  for (const k of ['CCC_OFFLINE', 'CCC_TELEMETRY', 'CCC_CI_TICKER', 'CCC_CONFIG_DIR', 'CLAUDE_CONFIG_DIR']) {
    if (!(extra && k in extra)) delete env[k];
  }
  return env;
}

describe('lib/network-mode.js switches', () => {
  it('everything off with no env and no config', () => {
    const env = { HOME: makeHome() };
    assert.deepEqual(nm.networkMode(env), { telemetry: false, offline: false, ciTicker: false });
  });

  it('CCC_TELEMETRY=1 or config telemetry:true opts in', () => {
    assert.equal(nm.isTelemetryEnabled({ HOME: makeHome(), CCC_TELEMETRY: '1' }), true);
    assert.equal(nm.isTelemetryEnabled({ HOME: makeHome({ telemetry: true }) }), true);
  });

  it('CCC_TELEMETRY=0 beats config telemetry:true', () => {
    assert.equal(nm.isTelemetryEnabled({ HOME: makeHome({ telemetry: true }), CCC_TELEMETRY: '0' }), false);
  });

  it('malformed config counts as disabled', () => {
    assert.equal(nm.isTelemetryEnabled({ HOME: makeHome('{not json') }), false);
    assert.equal(nm.isOffline({ HOME: makeHome('[true]') }), false);
  });

  it('CCC_OFFLINE=1 or config offline:true wins over telemetry and the CI ticker', () => {
    for (const env of [
      { HOME: makeHome(), CCC_OFFLINE: '1', CCC_TELEMETRY: '1', CCC_CI_TICKER: '1' },
      { HOME: makeHome({ offline: true, telemetry: true }), CCC_TELEMETRY: '1', CCC_CI_TICKER: '1' },
    ]) {
      assert.deepEqual(nm.networkMode(env), { telemetry: false, offline: true, ciTicker: false });
    }
  });

  it('CI ticker only with CCC_CI_TICKER=1', () => {
    assert.equal(nm.isCiTickerEnabled({ HOME: makeHome(), CCC_CI_TICKER: '1' }), true);
    assert.equal(nm.isCiTickerEnabled({ HOME: makeHome(), CCC_CI_TICKER: 'maybe' }), false);
  });

  const ON = ['1', 'true', 'yes', 'on', 'TRUE', 'Yes', 'ON', ' on '];
  const OFF = ['0', 'false', 'no', 'off', 'FALSE', 'No', 'OFF'];
  const UNKNOWN = ['', 'maybe', '2', 'enabled'];

  it('CCC_TELEMETRY accepts 1/true/yes/on and 0/false/no/off, case-insensitive', () => {
    for (const v of ON) {
      assert.equal(nm.isTelemetryEnabled({ HOME: makeHome(), CCC_TELEMETRY: v }), true, v);
    }
    for (const v of OFF) {
      assert.equal(nm.isTelemetryEnabled({ HOME: makeHome({ telemetry: true }), CCC_TELEMETRY: v }), false, v);
    }
    for (const v of UNKNOWN) {
      assert.equal(nm.isTelemetryEnabled({ HOME: makeHome(), CCC_TELEMETRY: v }), false, v);
      assert.equal(nm.isTelemetryEnabled({ HOME: makeHome({ telemetry: true }), CCC_TELEMETRY: v }), true, v);
    }
  });

  it('CCC_OFFLINE accepts 1/true/yes/on and 0/false/no/off, case-insensitive', () => {
    for (const v of ON) {
      assert.equal(nm.isOffline({ HOME: makeHome(), CCC_OFFLINE: v }), true, v);
      assert.equal(nm.isTelemetryEnabled({ HOME: makeHome(), CCC_OFFLINE: v, CCC_TELEMETRY: '1' }), false, v);
    }
    for (const v of [...OFF, ...UNKNOWN]) {
      assert.equal(nm.isOffline({ HOME: makeHome(), CCC_OFFLINE: v }), false, v);
    }
    assert.equal(nm.isOffline({ HOME: makeHome({ offline: true }), CCC_OFFLINE: 'false' }), true);
  });

  it('CCC_CI_TICKER accepts 1/true/yes/on and 0/false/no/off, case-insensitive', () => {
    for (const v of ON) {
      assert.equal(nm.isCiTickerEnabled({ HOME: makeHome(), CCC_CI_TICKER: v }), true, v);
      assert.equal(nm.isCiTickerEnabled({ HOME: makeHome(), CCC_CI_TICKER: v, CCC_OFFLINE: 'yes' }), false, v);
    }
    for (const v of [...OFF, ...UNKNOWN]) {
      assert.equal(nm.isCiTickerEnabled({ HOME: makeHome(), CCC_CI_TICKER: v }), false, v);
    }
  });

  it('options.homeDir overrides HOME', () => {
    const home = makeHome({ offline: true });
    assert.equal(nm.isOffline({ HOME: makeHome() }, { homeDir: home }), true);
  });
});

// telemetry.mjs keeps module-level state, so each case runs in its own child
// with a stubbed global fetch and an isolated HOME.
function telemetryFetchCalls(env) {
  const url = pathToFileURL(path.join(PLUGIN, 'lib', 'telemetry.mjs')).href;
  const script = [
    'let calls = 0;',
    'globalThis.fetch = async () => { calls += 1; return { ok: true }; };',
    `const t = await import(${JSON.stringify(url)});`,
    "for (let i = 0; i < 10; i++) t.track('hook_fired', { hook: 'Test' });",
    'await t.flushBatch();',
    'await new Promise((r) => setTimeout(r, 20));',
    'process.stdout.write(String(calls));',
  ].join('\n');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: cleanEnv(env), encoding: 'utf8', timeout: 15000,
  });
  assert.equal(r.status, 0, r.stderr);
  return Number(r.stdout.trim());
}

describe('telemetry.mjs is opt-in', () => {
  it('sends nothing with no env and no config', () => {
    assert.equal(telemetryFetchCalls({ HOME: makeHome() }), 0);
  });

  it('sends nothing when the config is malformed', () => {
    assert.equal(telemetryFetchCalls({ HOME: makeHome('{oops') }), 0);
  });

  it('sends when CCC_TELEMETRY=1 (stubbed fetch)', () => {
    assert.ok(telemetryFetchCalls({ HOME: makeHome(), CCC_TELEMETRY: '1' }) >= 1);
  });

  it('sends nothing with CCC_TELEMETRY=1 plus CCC_OFFLINE=1', () => {
    assert.equal(telemetryFetchCalls({ HOME: makeHome(), CCC_TELEMETRY: '1', CCC_OFFLINE: '1' }), 0);
  });

  it('sends nothing with config offline:true even when opted in', () => {
    assert.equal(telemetryFetchCalls({ HOME: makeHome({ offline: true, telemetry: true }) }), 0);
  });
});

// CC-2121: a hook process tracks one event and ends before the unref'd 5 s
// batch timer. The queue must still be sent when the event loop drains.
function telemetryOnExit(env) {
  const url = pathToFileURL(path.join(PLUGIN, 'lib', 'telemetry.mjs')).href;
  const script = [
    'globalThis.fetch = async (u, o) => {',
    "  process.stdout.write(JSON.stringify({ n: JSON.parse(o.body).events.length, signal: o.signal instanceof AbortSignal }) + '\\n');",
    '  return { ok: true };',
    '};',
    `const t = await import(${JSON.stringify(url)});`,
    "t.track('hook_fired', { hook: 'Stop', handler: 'test' });",
  ].join('\n');
  const started = Date.now();
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: cleanEnv(env), encoding: 'utf8', timeout: 15000,
  });
  assert.equal(r.status, 0, r.stderr);
  return { sends: r.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)), ms: Date.now() - started };
}

describe('telemetry.mjs flushes when a short-lived process ends (CC-2121)', () => {
  it('sends the queued event once, with an abort signal, without waiting for the batch timer', () => {
    const { sends, ms } = telemetryOnExit({ HOME: makeHome(), CCC_TELEMETRY: '1' });
    assert.deepEqual(sends, [{ n: 1, signal: true }]);
    assert.ok(ms < 4500, `exited in ${ms} ms`);
  });

  it('sends nothing on exit when telemetry is off', () => {
    assert.deepEqual(telemetryOnExit({ HOME: makeHome() }).sends, []);
  });
});

describe('update-nudge.js honours CCC_OFFLINE', () => {
  let run;
  before(async () => {
    ({ run } = await import(pathToFileURL(path.join(PLUGIN, 'hooks', 'update-nudge.js')).href));
  });

  function pluginRoot() {
    const root = fs.mkdtempSync(path.join(TMP, 'plugin-'));
    fs.mkdirSync(path.join(root, '.claude-plugin'));
    fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '1.0.0' }));
    return root;
  }

  for (const [label, env] of [
    ['CCC_OFFLINE=1', () => ({ HOME: makeHome(), CCC_OFFLINE: '1' })],
    ['config offline:true', () => ({ HOME: makeHome({ offline: true }) })],
  ]) {
    it(`never fetches under ${label}`, async () => {
      let calls = 0;
      const fetchText = async () => { calls += 1; return JSON.stringify({ version: '9.9.9' }); };
      const res = await run({ env: { ...env(), CLAUDE_PLUGIN_ROOT: pluginRoot() }, fetchText });
      assert.equal(calls, 0);
      assert.equal(res.suppressOutput, true);
    });
  }

  it('still fetches when online (control)', async () => {
    let calls = 0;
    const fetchText = async () => { calls += 1; return JSON.stringify({ version: '1.0.0' }); };
    await run({ env: { HOME: makeHome(), CLAUDE_PLUGIN_ROOT: pluginRoot() }, fetchText });
    assert.equal(calls, 1);
  });
});

describe('suggest-ticker.js CI lookup is opt-in', () => {
  let ciStatusCached;
  before(async () => {
    ({ ciStatusCached } = await import(pathToFileURL(path.join(PLUGIN, 'hooks', 'suggest-ticker.js')).href));
  });

  function spy() {
    const fn = () => { fn.calls += 1; return { unref() {} }; };
    fn.calls = 0;
    return fn;
  }

  it('does not spawn gh by default', () => {
    const spawnFn = spy();
    const cache = path.join(makeHome(), 'ci.json');
    assert.equal(ciStatusCached(cache, { env: { HOME: makeHome() }, spawnFn }), 'unknown');
    assert.equal(spawnFn.calls, 0);
  });

  it('does not spawn gh with CCC_CI_TICKER=1 plus CCC_OFFLINE=1', () => {
    const spawnFn = spy();
    const cache = path.join(makeHome(), 'ci.json');
    ciStatusCached(cache, { env: { HOME: makeHome(), CCC_CI_TICKER: '1', CCC_OFFLINE: '1' }, spawnFn });
    assert.equal(spawnFn.calls, 0);
  });

  it('spawns the stubbed gh refresh with CCC_CI_TICKER=1', () => {
    const spawnFn = spy();
    const cache = path.join(makeHome(), 'ci.json');
    ciStatusCached(cache, { env: { HOME: makeHome(), CCC_CI_TICKER: '1' }, spawnFn });
    assert.equal(spawnFn.calls, 1);
  });
});

const PROMO = /Powered by|powered-by|partner credit|via (Supabase|Vercel|Upstash)|cc Vercel|cc Upstash/i;

describe('no partner promos in hooks or the status line', () => {
  it('session-end prints no promo and suppresses output', () => {
    const home = makeHome();
    const sessions = path.join(home, '.claude', 'commander', 'sessions');
    fs.mkdirSync(sessions, { recursive: true });
    fs.writeFileSync(path.join(sessions, 'active-session.json'), JSON.stringify({ startedAt: new Date().toISOString() }));
    const r = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'session-end.js')], {
      input: JSON.stringify({ session_id: 'cc2111' }),
      env: cleanEnv({ HOME: home, USERPROFILE: home }),
      encoding: 'utf8', timeout: 15000,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, PROMO);
    assert.deepEqual(JSON.parse(r.stdout.trim().split('\n').pop()), { continue: true, suppressOutput: true });
    assert.ok(fs.existsSync(path.join(home, '.claude', 'commander', 'knowledge', 'session-cc2111.json')));
  });

  it('status line shows no partner credit even with the old config flag', () => {
    const home = makeHome({ show_partner_credit: true });
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'status-line.js')], {
      env: cleanEnv({ HOME: home, USERPROFILE: home, NO_COLOR: '1' }), encoding: 'utf8', timeout: 15000,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('CCC'), 'status line rendered');
    assert.doesNotMatch(r.stdout, PROMO);
  });

  it('hook, lib and console sources carry no promo rotation', () => {
    const files = [
      ...fs.readdirSync(path.join(PLUGIN, 'hooks')).filter((f) => /\.(m?js)$/.test(f)).map((f) => path.join(PLUGIN, 'hooks', f)),
      ...fs.readdirSync(path.join(PLUGIN, 'hooks', 'orchestrator')).map((f) => path.join(PLUGIN, 'hooks', 'orchestrator', f)),
      ...fs.readdirSync(path.join(PLUGIN, 'lib')).filter((f) => /\.(m?js|html|tpl)$/.test(f)).map((f) => path.join(PLUGIN, 'lib', f)),
      path.join(__dirname, '..', 'status-line.js'),
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      assert.doesNotMatch(src, PROMO, f);
      assert.doesNotMatch(src, /\[\s*'Supabase',\s*'Vercel'/, f);
    }
  });
});

describe('ccc-connect catalog is neutral and disclosed', () => {
  const DISCLOSURE = 'Some links below are affiliate';
  const skill = fs.readFileSync(path.join(PLUGIN, 'skills', 'ccc-connect', 'SKILL.md'), 'utf8');
  const ref = fs.readFileSync(path.join(PLUGIN, 'skills', 'ccc-connect', 'references', 'connectors.md'), 'utf8');

  it('disclosure sits above the first catalog table in both files', () => {
    for (const doc of [skill, ref]) {
      const at = doc.indexOf(DISCLOSURE);
      assert.ok(at >= 0, 'disclosure present');
      assert.ok(at < doc.indexOf('\n|'), 'disclosure before the first table');
    }
  });

  it('no default vendor marker', () => {
    for (const doc of [skill, ref]) {
      assert.doesNotMatch(doc, /default backend|default vendor|always list it first/i);
    }
    const level3 = skill.slice(skill.indexOf('**Level 3'), skill.indexOf('**Arguments:**'));
    for (const row of level3.split('\n').filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith('| Category'))) {
      assert.ok(!row.includes('🟢'), 'no pre-selected connector: ' + row);
      const names = row.split('|')[2].split(' · ').map((o) => o.split(' — ')[0].replace('[aff]', '').trim().toLowerCase());
      assert.deepEqual(names, [...names].sort(), 'alphabetical: ' + row);
    }
  });

  it('reference rows are alphabetical', () => {
    const start = ref.indexOf('## Wiring path');
    const section = ref.slice(start, ref.indexOf('\n## ', start + 1));
    const rows = section.split('\n').filter((l) => /^\| /.test(l) && !l.startsWith('| Connector'));
    const names = rows.map((r) => r.split('|')[1].replace('[aff]', '').trim().toLowerCase());
    assert.ok(names.length > 10);
    assert.deepEqual(names, [...names].sort());
  });
});
