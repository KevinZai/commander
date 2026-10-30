'use strict';
/**
 * broadcast-route.js
 * Routing default, dedup and receipts for /ccc-broadcast (CC-1598).
 *
 * routeSignal(config, signal) picks where one signal goes:
 *   - config.opsChannel {channel, target} set -> every signal goes to that one
 *     ops channel (the "one global ops comms channel" default);
 *   - otherwise the per-signal defaults below, limited to config.channels,
 *     falling back to the other configured channel, then to log-only.
 * config.audiences still overrides the audience label per signal.
 * dedupKey/isDuplicate stop the same message going out twice inside the
 * digest window; addReceipt keeps the connector's message id and the last 20
 * relays. A send without a message id is recorded as not delivered.
 *
 * Pure functions plus a small CLI for the skill:
 *   node broadcast-route.js route <signal> [--config <file>]
 *   node broadcast-route.js dedup <signal> <summary> [--scope <id>] [--config <file>]
 * With no config file at the default path every route is log-only.
 * Nothing here sends a message or stores credentials.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHANNELS = ['chat', 'email'];
const RECENT_MAX = 20;
const DEFAULTS = {
  ship: { audience: 'team', channel: 'chat' },
  ci: { audience: 'team', channel: 'chat' },
  task: { audience: 'owner', channel: 'chat' },
  cost: { audience: 'owner', channel: 'email' },
  incident: { audience: 'team', channel: 'chat', immediate: true },
  digest: { audience: 'owner', channel: 'email' },
};
const CREDENTIAL_KEY = /(token|secret|password|webhook|api[_-]?key|credential)/i;

function findCredentialKey(value, at) {
  if (!value || typeof value !== 'object') return null;
  for (const [k, v] of Object.entries(value)) {
    if (CREDENTIAL_KEY.test(k)) return at ? `${at}.${k}` : k;
    const hit = findCredentialKey(v, at ? `${at}.${k}` : k);
    if (hit) return hit;
  }
  return null;
}

/** Throws on a config the router must not act on; returns it otherwise. */
function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('broadcast config must be a JSON object');
  }
  const cred = findCredentialKey(config, '');
  if (cred) throw new Error(`broadcast config must not hold credentials (found "${cred}")`);
  if (config.channels !== undefined) {
    if (!Array.isArray(config.channels) || config.channels.some((c) => !CHANNELS.includes(c))) {
      throw new Error('channels must be a list of "chat" and/or "email"');
    }
  }
  if (config.opsChannel != null) {
    const ops = config.opsChannel;
    if (typeof ops !== 'object' || !CHANNELS.includes(ops.channel)) {
      throw new Error('opsChannel.channel must be "chat" or "email"');
    }
    if (typeof ops.target !== 'string' || !ops.target.trim()) {
      throw new Error('opsChannel.target must name the channel or address');
    }
  }
  return config;
}

function targetFor(config, channel) {
  if (channel === 'chat') return config.chatTarget || null;
  if (channel === 'email') return config.emailTo || null;
  return null;
}

/** -> {signal, audience, channel: 'chat'|'email'|'log', target, immediate, via} */
function routeSignal(config, signal) {
  validateConfig(config);
  const sig = Object.prototype.hasOwnProperty.call(DEFAULTS, signal) ? signal : 'digest';
  const def = DEFAULTS[sig];
  const audiences = config.audiences && typeof config.audiences === 'object' ? config.audiences : {};
  const audience = typeof audiences[sig] === 'string' ? audiences[sig] : def.audience;
  const immediate = Boolean(def.immediate);

  const enabled = Array.isArray(config.channels) ? config.channels : [];
  if (config.opsChannel) {
    // The ops channel never overrides log-only: its connector must be enabled.
    const { channel, target } = config.opsChannel;
    return enabled.includes(channel)
      ? { signal: sig, audience, channel, target: target.trim(), immediate, via: 'opsChannel' }
      : { signal: sig, audience, channel: 'log', target: null, immediate, via: 'opsChannel' };
  }

  let channel = 'log';
  if (enabled.includes(def.channel)) channel = def.channel;
  else if (enabled.length) channel = enabled[0];
  return { signal: sig, audience, channel, target: targetFor(config, channel), immediate, via: 'default' };
}

/**
 * Stable 16-hex key for one event. scope names where it came from (project
 * plus CI run id or commit) so the same summary from another repo or run is
 * a new event; summary case and spacing are ignored.
 */
function dedupKey(signal, summary, scope) {
  const norm = String(summary == null ? '' : summary).trim().replace(/\s+/g, ' ').toLowerCase();
  const sc = String(scope == null ? '' : scope).trim();
  return crypto.createHash('sha256').update(`${signal}\n${sc}\n${norm}`).digest('hex').slice(0, 16);
}

/** True when a delivered relay with this key is inside the window. */
function isDuplicate(recent, key, opts) {
  const now = (opts && opts.now) || Date.now();
  const hours = Number((opts && opts.windowHours) || 24);
  const windowMs = (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600 * 1000;
  return (Array.isArray(recent) ? recent : []).some((r) => {
    if (!r || r.key !== key || r.ok !== true) return false;
    const at = Date.parse(r.at);
    return Number.isFinite(at) && now - at >= 0 && now - at < windowMs;
  });
}

/** New recent list with this receipt appended, capped at the last 20. */
function addReceipt(recent, receipt) {
  const messageId = receipt.messageId == null || receipt.messageId === '' ? null : String(receipt.messageId);
  const entry = {
    at: receipt.at || new Date().toISOString(),
    signal: receipt.signal,
    channel: receipt.channel,
    summary: receipt.summary,
    key: receipt.key || dedupKey(receipt.signal, receipt.summary, receipt.scope),
    ok: receipt.ok === true && messageId !== null,
    messageId,
  };
  return (Array.isArray(recent) ? recent : []).concat(entry).slice(-RECENT_MAX);
}

function defaultConfigPath(env) {
  env = env || process.env;
  const home = env.HOME || os.homedir();
  const dir = env.CCC_CONFIG_DIR || env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const lane = path.join(dir, 'commander', 'broadcast.json');
  const legacy = path.join(home, '.claude', 'commander', 'broadcast.json');
  return fs.existsSync(lane) || !fs.existsSync(legacy) ? lane : legacy;
}

function readConfig(file) {
  return validateConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function main(argv) {
  const args = argv.slice();
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    const value = args[i + 1];
    args.splice(i, 2);
    if (value === undefined) throw new Error(`${name} needs a value`);
    return value;
  };
  const file = flag('--config');
  const scope = flag('--scope');
  const [cmd, signal, ...rest] = args;
  if (!['route', 'dedup'].includes(cmd) || !signal || (cmd === 'dedup' && !rest.length)) {
    throw new Error('usage: broadcast-route.js route <signal> | dedup <signal> <summary> [--scope <id>] [--config <file>]');
  }
  // No config at the default path (a cloud Routine, or setup not run yet)
  // means log-only; an explicit --config that is missing is an error.
  const target = file || defaultConfigPath();
  const config = !file && !fs.existsSync(target) ? { channels: [] } : readConfig(target);
  if (cmd === 'route') return routeSignal(config, signal);
  const key = dedupKey(signal, rest.join(' '), scope);
  return { key, duplicate: isDuplicate(config.recent, key, { windowHours: config.digestWindowHours }) };
}

if (require.main === module) {
  try {
    process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + '\n');
  } catch (err) {
    process.stderr.write(`broadcast-route: ${err.message}\n`);
    process.exit(2);
  }
}

module.exports = {
  DEFAULTS,
  validateConfig,
  routeSignal,
  dedupKey,
  isDuplicate,
  addReceipt,
  defaultConfigPath,
  main,
};
