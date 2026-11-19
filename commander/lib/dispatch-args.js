'use strict';

// `ccc --dispatch` argument handling. The task is data, never an option: in the
// canonical form it follows "--" (`ccc --dispatch --agent reviewer -- "<task>"`),
// and everything after "--" is kept out of every flag scan, so a task such as
// "--help" or "--update" can never select another CLI operation. The older form
// (`ccc --dispatch "<task>" ...`) still works; its task value is removed from the
// flag list too, and a task that starts with "-" must use the "--" form.

var AGENT_RE = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)?$/;

function splitArgs(args) {
  var list = Array.isArray(args) ? args.slice() : [];
  var dashAt = list.indexOf('--');
  var flags = dashAt === -1 ? list : list.slice(0, dashAt);
  var operands = dashAt === -1 ? [] : list.slice(dashAt + 1);
  var task = null;
  var legacy = false;
  var di = flags.indexOf('--dispatch');
  if (di !== -1) {
    if (dashAt !== -1) {
      task = operands.join(' ');
    } else if (di + 1 < flags.length) {
      task = flags[di + 1];
      flags = flags.slice(0, di + 1).concat(flags.slice(di + 2));
      legacy = true;
    }
  }
  return { flags: flags, operands: operands, task: task, legacy: legacy };
}

function flagValue(flags, name) {
  var i = flags.indexOf(name);
  return i === -1 ? undefined : flags[i + 1];
}

// The dispatch request from split args, or { error } with a usage message.
function parseDispatch(split) {
  var usage = 'Usage: ccc --dispatch [--agent NAME] [--json --model X --max-turns N --budget N --cwd PATH] -- "task"';
  var task = split.task;
  if (task == null || !String(task).trim()) return { error: usage };
  if (split.legacy && /^-/.test(task)) return { error: 'A task that starts with "-" goes after "--". ' + usage };
  var f = split.flags;
  var agent = flagValue(f, '--agent');
  if (f.indexOf('--agent') !== -1 && (typeof agent !== 'string' || !AGENT_RE.test(agent))) {
    return { error: '--agent needs an agent name (letters, digits, dashes). ' + usage };
  }
  return {
    task: task,
    agent: agent,
    json: f.indexOf('--json') !== -1,
    model: flagValue(f, '--model'),
    maxTurns: f.indexOf('--max-turns') !== -1 ? parseInt(flagValue(f, '--max-turns'), 10) : 30,
    maxBudgetUsd: f.indexOf('--budget') !== -1 ? parseFloat(flagValue(f, '--budget')) : undefined,
    cwd: flagValue(f, '--cwd'),
  };
}

module.exports = { splitArgs: splitArgs, parseDispatch: parseDispatch, AGENT_RE: AGENT_RE };
