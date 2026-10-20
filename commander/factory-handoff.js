'use strict';

const VERSION = 'factory-loop-0324';

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

// Keep the opt-in Fleet boundary compatible without a runtime cross-repository import.
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
function line(value, name, max) {
  requiredString(value, name);
  if (value.length > max || /[\p{Cc}\p{Cf}\u2028\u2029]/u.test(value)) throw new TypeError(`${name} must be a single-line string of at most ${max} characters`);
  return value;
}
function list(value, name, count, length) {
  if (!Array.isArray(value) || value.length > count) throw new TypeError(`${name} must be an array with at most ${count} entries`);
  return value.map((v) => line(v, name, length));
}
function routing(input) {
  const out = {};
  if (input.project !== undefined) {
    if (typeof input.project !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,60}$/.test(input.project) || input.project.includes('..')) throw new TypeError('project must be a workspace name');
    out.project = input.project;
  }
  if (input.worktree !== undefined && input.worktree !== null) {
    if (!object(input.worktree) || Object.keys(input.worktree).some((k) => !['path', 'branch', 'base'].includes(k))) throw new TypeError('invalid worktree');
    out.worktree = Object.fromEntries([['path', 400], ['branch', 200], ['base', 200]].map(([k, max]) => [k, line(input.worktree[k], `worktree.${k}`, max).trim()]));
  }
  if (!out.project && !out.worktree) throw new TypeError('project or worktree is required');
  if (input.kind === 'project' && !out.project) throw new TypeError('kind project requires project');
  if (input.source !== undefined) {
    const v = input.source;
    if (!object(v) || !['manual', 'linear', 'github', 'chat', 'other'].includes(v.kind || 'manual')) throw new TypeError('invalid source');
    out.source = { kind: v.kind || 'manual' };
    for (const [key, max] of [['key', 64], ['url', 400], ['workspace', 40]]) if (v[key] !== undefined) out.source[key] = v[key] === '' ? '' : line(v[key], `source.${key}`, max);
    if (out.source.url && !['http:', 'https:'].includes(new URL(out.source.url).protocol)) throw new TypeError('source.url must be http(s)');
  }
  if (input.requires !== undefined) {
    const v = input.requires;
    if (!object(v)) throw new TypeError('requires must be an object');
    out.requires = {};
    if (v.lane != null && v.lane !== '') {
      if (typeof v.lane !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(v.lane)) throw new TypeError('invalid requires.lane');
      out.requires.lane = v.lane;
    }
    if (v.plan != null) {
      if (!['team', 'personal', 'any'].includes(v.plan)) throw new TypeError('invalid requires.plan');
      out.requires.plan = v.plan;
    }
    if (v.model != null && v.model !== '') {
      if (!['opus', 'fable', 'sonnet', 'haiku', 'astra', 'sol'].includes(v.model)) throw new TypeError('invalid requires.model');
      out.requires.model = v.model;
    }
    if (v.tags !== undefined) out.requires.tags = list(v.tags, 'requires.tags', 10, 40);
  }
  if (input.boundaries !== undefined) out.boundaries = list(input.boundaries, 'boundaries', 20, 200);
  if (input.reportTo !== undefined) out.reportTo = input.reportTo === '' ? '' : line(input.reportTo, 'reportTo', 200);
  if (input.git !== undefined) {
    const v = input.git;
    if (!object(v) || Object.keys(v).some((k) => !['push', 'pr', 'merge', 'prBody'].includes(k))) throw new TypeError('invalid git');
    out.git = { push: false, pr: 'none', merge: 'none', prBody: 'untracked', ...v };
    if (typeof out.git.push !== 'boolean') throw new TypeError('git.push must be boolean');
    for (const [k, values] of Object.entries({ pr: ['none', 'draft', 'ready'], merge: ['none', 'task-local'], prBody: ['untracked', 'commit'] })) if (!values.includes(out.git[k])) throw new TypeError(`invalid git.${k}`);
    if (!out.git.push && out.git.pr !== 'none') throw new TypeError('git.pr requires git.push');
    if (out.git.merge === 'task-local' && !out.worktree) throw new TypeError('git.merge task-local requires worktree');
  }
  return out;
}

// This builds intake data, never a completion receipt. Fleet owns stage evidence,
// admission, child execution, and the single terminal notification.
function buildFactoryHandoff(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  if (!['code', 'project'].includes(input.kind)) throw new TypeError('kind must be code or project');
  const title = line(input.title, 'title', 120);
  const route = routing(input);
  const brief = requiredString(input.brief, 'brief');
  const authorization = requiredString(input.authorization, 'authorization');
  const context = requiredString(input.context, 'context');
  const report = requiredString(input.report, 'report');
  const pingback = requiredString(input.pingback, 'pingback');
  const result = {
    ...route,
    kind: 'code',
    title,
    brief: `${brief}\n\nFactory handoff ${VERSION}. Fleet is the stage authority.\nAuthorization: ${authorization}\nContext: ${context}\nTerminal report: ${report}\nTerminal pingback: ${pingback}\nUse Fleet's single terminal report/pingback; worker exit is only worker_finished. Preserve authorization boundaries and hold on missing evidence.`,
    factoryPolicy: {
      version: VERSION,
      triage: { model: 'gpt-6.1-sol', effort: 'low' },
      verification: { modes: ['real_run', 'e2e'], exitCode: 0, revisionRequired: true },
      review: { minRounds: 2, maxRounds: 3, differentModel: true, differentVendor: true },
      terminalOwner: 'fleet',
    },
  };
  if (result.brief.length > 4000) throw new RangeError('full handoff brief exceeds Fleet 4000 character limit');
  return result;
}

module.exports = { VERSION, buildFactoryHandoff };
