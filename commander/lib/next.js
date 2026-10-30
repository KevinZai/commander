'use strict';
/**
 * `ccc next --json`: machine-readable "what next" for Fleet. Given one job
 * ({kind, tags, title, description}) it answers what to run and when, scored
 * by the #188 routing registry (hooks/lib/ccc-routes.json + route-scorer.mjs).
 *
 * Drop-in for fleet#328's bin/ccc-next stopgap (docs/FLEET-CHECKIN.md):
 *   {schema, action: proceed|defer|hold, when: now|<ISO>, skill, reason,
 *    version, source: 'ccc-next', tier, score, route_source, candidates[]}
 * Exit 2 bad input, 3 no usable commander plugin on this lane.
 * Read-only: it never dispatches, writes or calls the network.
 */

var fs = require('fs');
var path = require('path');
var url = require('url');

var lane = require('./lane');
var release = require('./release-info');

var SCHEMA = 1;
var MAX_INPUT = 65536;
var PLUGIN_SRC = path.join(__dirname, '..', 'cowork-plugin');
// Same fallback maps as fleet#328's stopgap, used when the registry has no
// confident match: a tag wins over the kind; the hub is the last resort.
var KIND_SKILL = { code: 'ccc-build', research: 'ccc-research', review: 'ccc-review', docs: 'ccc-doc-sync', other: 'ccc-suggest' };
var TAG_SKILL = {
  design: 'ccc-design', plan: 'ccc-plan', planning: 'ccc-plan', debug: 'ccc-systematic-debugging', bug: 'ccc-systematic-debugging',
  deploy: 'ccc-deploy-check', security: 'ccc-security', test: 'ccc-testing', qa: 'ccc-qa', audit: 'ccc-xray',
};

function fail(code, message) {
  var err = new Error(message);
  err.exitCode = code;
  return err;
}

/** Validate a job object; returns {kind, tags[], text}. Throws exit-2 errors. */
function normalizeJob(job) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) throw fail(2, 'job must be a JSON object');
  var tags = Array.isArray(job.tags) ? job.tags.map(function(t) { return String(t).toLowerCase().trim(); }).filter(Boolean) : [];
  var kind = typeof job.kind === 'string' ? job.kind.toLowerCase().trim() : '';
  var text = [job.title, job.description].filter(function(s) { return typeof s === 'string'; }).join('. ');
  return { kind: kind, tags: tags, text: text };
}

function parseJobJson(input) {
  if (input.length > MAX_INPUT) throw fail(2, 'input too large');
  var job;
  try { job = JSON.parse(input.trim() || '{}'); } catch (_e) { throw fail(2, 'input is not JSON'); }
  return normalizeJob(job);
}

/** The plugin whose skills and registry answer: the lane's installed release. */
function pluginRoot(env, cwd) {
  var p = release.installedPlugin(lane.resolveLane(env).configDir, cwd || process.cwd());
  if (!p || !p.usable) throw fail(3, 'CC Commander plugin is not installed on this lane (no usable commander@* record)');
  return p;
}

/** fleet-hold.json in the lane state dir (legacy fallback): hold or defer new jobs. */
function readHold(env, now) {
  var file = lane.readable('fleet-hold.json', env);
  var hold;
  try { hold = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    if (e.code === 'ENOENT') return null;
    // A damaged pause control must not authorize work: fail closed.
    return { action: 'hold', when: 'now', reason: 'CCC hold: unreadable ' + path.basename(file) + ' (' + (e.code || 'invalid JSON') + ')', invalid: true };
  }
  return interpretHold(hold, now);
}

/** A parsed fleet-hold.json record -> {action, when, reason, invalid?} or null (no hold). */
function interpretHold(hold, now) {
  var invalid = function(why) { return { action: 'hold', when: 'now', reason: 'CCC hold: invalid fleet-hold.json (' + why + ')', invalid: true }; };
  if (!hold || typeof hold !== 'object' || Array.isArray(hold)) return invalid('not an object');
  if (hold.hold !== undefined && typeof hold.hold !== 'boolean') return invalid('hold must be true or false');
  if (hold.until !== undefined && (typeof hold.until !== 'string' || isNaN(Date.parse(hold.until)))) return invalid('until must be an ISO time');
  var reason = String(hold.reason || '').slice(0, 160);
  if (hold.hold === true) return { action: 'hold', when: 'now', reason: 'CCC hold' + (reason ? ': ' + reason : '') };
  var until = hold.until !== undefined ? Date.parse(hold.until) : NaN;
  if (until > now) return { action: 'defer', when: new Date(until).toISOString(), reason: 'CCC defer' + (reason ? ': ' + reason : '') };
  return null;
}

/**
 * Decide. opts: {job (raw object) | input (JSON text), env, cwd, now}.
 * Async because the scorer is an ES module.
 */
async function next(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var job = opts.input !== undefined ? parseJobJson(opts.input) : normalizeJob(opts.job || {});
  var plugin = pluginRoot(env, opts.cwd);
  var has = function(id) { return fs.existsSync(path.join(plugin.installPath, 'skills', id, 'SKILL.md')); };

  var registry = path.join(plugin.installPath, 'hooks', 'lib', 'ccc-routes.json');
  var routeSource = 'installed';
  if (!fs.existsSync(registry)) { registry = path.join(PLUGIN_SRC, 'hooks', 'lib', 'ccc-routes.json'); routeSource = 'checkout'; }
  var scorer = await import(url.pathToFileURL(path.join(PLUGIN_SRC, 'hooks', 'lib', 'route-scorer.mjs')).href);
  var candidates = [];
  var text = [job.text, job.tags.join(' ')].filter(Boolean).join('. ');
  if (text) candidates = scorer.scoreRoutes(text, scorer.loadRoutes(registry));
  var skills = candidates.filter(function(c) { return c.route.kind === 'skill' && has(c.route.id); });
  var tier = skills.length ? scorer.tierFor(skills, 'auto') : 'low';

  var skill;
  var reason;
  if (tier !== 'low') {
    skill = skills[0].route.id;
    reason = 'registry ' + tier + ' match ' + skills[0].score;
  } else {
    var own = function(map, key) { return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null; };
    var fromTag = job.tags.map(function(t) { return own(TAG_SKILL, t); }).filter(function(s) { return s && has(s); })[0];
    var fromKind = own(KIND_SKILL, job.kind) && has(own(KIND_SKILL, job.kind)) ? own(KIND_SKILL, job.kind) : null;
    skill = fromTag || fromKind || 'ccc';
    reason = fromTag ? 'tag' : fromKind ? 'kind ' + job.kind : 'hub';
  }

  var out = {
    schema: SCHEMA,
    action: 'proceed',
    when: 'now',
    skill: '/' + skill,
    reason: 'CCC ' + plugin.version + ': ' + reason + ' -> /' + skill,
    version: plugin.version,
    source: 'ccc-next',
    tier: tier,
    score: tier !== 'low' ? skills[0].score : null,
    route_source: routeSource,
    candidates: skills.slice(0, 3).map(function(c) { return { skill: '/' + c.route.id, score: c.score }; }),
  };
  var hold = readHold(env, opts.now ? Date.parse(opts.now) : Date.now());
  if (hold) { out.action = hold.action; out.when = hold.when; out.reason = hold.reason; }
  return out;
}

/** Job from CLI flags (--kind K --tags a,b --title T), or null when none given. */
function jobFromArgs(args) {
  var val = function(flag) { var i = args.indexOf(flag); return i >= 0 && args[i + 1] && args[i + 1].indexOf('--') !== 0 ? args[i + 1] : null; };
  var kind = val('--kind');
  var tags = val('--tags');
  var title = val('--title');
  if (kind === null && tags === null && title === null) return null;
  return { kind: kind || undefined, tags: tags ? tags.split(',') : [], title: title || undefined };
}

module.exports = {
  SCHEMA: SCHEMA,
  next: next,
  normalizeJob: normalizeJob,
  parseJobJson: parseJobJson,
  readHold: readHold,
  interpretHold: interpretHold,
  jobFromArgs: jobFromArgs,
};
