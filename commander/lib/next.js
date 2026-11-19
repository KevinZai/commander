'use strict';
/**
 * `ccc next --json`: machine-readable "what next" for Fleet. Given one job
 * ({kind, tags, title, description}) it answers what to run and when, scored
 * by the #188 routing registry (hooks/lib/ccc-routes.json + route-scorer.mjs).
 *
 * Drop-in for fleet#328's bin/ccc-next stopgap (docs/FLEET-CHECKIN.md):
 *   {schema, action: proceed|defer|hold, when: now|<ISO>, skill, reason,
 *    version, source: 'ccc-next', tier, score, route_source, candidates[],
 *    skills[], prompt_block}
 * `skill` is the one skill Fleet's dispatch gate hands the run, or null;
 * `skills` is the worker's pre-run pick (0-2, best first) and `prompt_block`
 * the same pick as a paragraph for the worker's prompt. Every skill in
 * either field is a worker skill (route-hints.json "worker": visible, no
 * side effect, one thread), and `skill` is always `skills[0]` or null, so
 * Fleet never receives a deploy, tracker, fleet or hidden skill.
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
// Fleet tasks are terse and rarely phrased like a chat request, so the
// worker pick takes weaker matches than the chat router's menu threshold,
// down to one supporting keyword, and at most two skills.
var PICK_FLOOR = 0.25;
var PICK_MAX = 2;
var PLUGIN_SRC = path.join(__dirname, '..', 'cowork-plugin');
// Fallbacks when the registry has no match for the text: a tag wins over
// the kind. Only worker skills; a kind or tag without one maps to nothing.
var KIND_SKILL = { research: 'ccc-research' };
var TAG_SKILL = {
  design: 'ccc-design', debug: 'ccc-systematic-debugging', bug: 'ccc-systematic-debugging',
  security: 'ccc-security', test: 'ccc-testing', qa: 'ccc-testing', data: 'ccc-data', devops: 'ccc-devops',
  seo: 'ccc-seo', marketing: 'ccc-marketing', mobile: 'ccc-mobile', saas: 'ccc-saas', research: 'ccc-research',
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
  var routes = scorer.loadRoutes(registry);
  var byId = new Map(routes.map(function(r) { return [r.id, r]; }));
  // A worker skill that this lane's plugin actually ships.
  var eligible = function(id) { return byId.has(id) && scorer.workerEligible(byId.get(id)) && has(id); };
  var candidates = [];
  var text = [job.text, job.tags.join(' ')].filter(Boolean).join('. ');
  // scoreTask reads the whole description in pieces, not just its first 600 chars.
  if (text) candidates = scorer.scoreTask(text, routes);
  var skills = candidates.filter(function(c) { return c.route.kind === 'skill' && has(c.route.id); });
  // Pick: registry matches above the floor, then tag and kind fallbacks; worker skills only.
  var picks = [];
  var why = [];
  var add = function(id, reason) {
    if (id && eligible(id) && picks.indexOf(id) < 0) { picks.push(id); why.push(reason); }
  };
  var own = function(map, key) { return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null; };
  skills.forEach(function(c) { if (c.score >= PICK_FLOOR) add(c.route.id, 'registry ' + scorer.tierFor([c], 'auto') + ' match ' + c.score); });
  job.tags.forEach(function(t) { add(own(TAG_SKILL, t), 'tag ' + t); });
  add(own(KIND_SKILL, job.kind), 'kind ' + job.kind);
  picks = picks.slice(0, PICK_MAX);
  var skill = picks[0] || null;
  var reason = skill ? why[0] : 'no matching skill';
  var top = skill ? skills.filter(function(c) { return c.route.id === skill; })[0] : null;

  var out = {
    schema: SCHEMA,
    action: 'proceed',
    when: 'now',
    skill: skill ? '/' + skill : null,
    reason: 'CCC ' + plugin.version + ': ' + reason + (skill ? ' -> /' + skill : ''),
    version: plugin.version,
    source: 'ccc-next',
    tier: top ? scorer.tierFor([top], 'auto') : 'low',
    score: top ? top.score : null,
    route_source: routeSource,
    candidates: skills.slice(0, 3).map(function(c) { return { skill: '/' + c.route.id, score: c.score }; }),
    skills: picks.map(function(id) { return '/' + id; }),
    prompt_block: promptBlock(picks, plugin.version),
  };
  var hold = readHold(env, opts.now ? Date.parse(opts.now) : Date.now());
  if (hold) { out.action = hold.action; out.when = hold.when; out.reason = hold.reason; }
  return out;
}

/** The worker's pre-run paragraph for this pick. */
function promptBlock(picks, version) {
  var head = 'CCC pre-run (CC Commander ' + version + '): ';
  if (!picks.length) return head + 'no CCC skill fits this task. Work without one; do not open the /ccc menu.';
  var list = picks.map(function(id) { return '/' + id; }).join(', then ');
  return head + 'load ' + list + ' where it fits this task. Do not load other CCC skills. Stay in this run: do not start ' +
    'other agents or workflows, take the recommended option where the skill would ask a question, and never run deploy, push, publish or tracker steps.';
}

var JOB_FLAGS = ['--kind', '--tags', '--title', '--description'];

/**
 * Job from CLI flags (--kind K --tags a,b --title T --description D), or
 * null when none given. Parsed left to right: a flag's value is the next
 * argument whatever it looks like, so a description reading "--update" stays
 * data. Prefer JSON on stdin for task text.
 */
function jobFromArgs(args) {
  var vals = {};
  for (var i = 0; i < args.length; i++) {
    if (JOB_FLAGS.indexOf(args[i]) >= 0 && i + 1 < args.length) { vals[args[i]] = args[i + 1]; i++; }
  }
  var val = function(flag) { return Object.prototype.hasOwnProperty.call(vals, flag) ? vals[flag] : null; };
  var kind = val('--kind');
  var tags = val('--tags');
  var title = val('--title');
  var description = val('--description');
  if (kind === null && tags === null && title === null && description === null) return null;
  var job = { kind: kind || undefined, tags: tags ? tags.split(',') : [], title: title || undefined };
  if (description) job.description = description;
  return job;
}

module.exports = {
  SCHEMA: SCHEMA,
  next: next,
  promptBlock: promptBlock,
  normalizeJob: normalizeJob,
  parseJobJson: parseJobJson,
  readHold: readHold,
  interpretHold: interpretHold,
  jobFromArgs: jobFromArgs,
};
