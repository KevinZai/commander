#!/usr/bin/env node
'use strict';

/**
 * CC Commander — Local MCP Server (v4.0 Beta)
 *
 * Implements MCP stdio transport (JSON-RPC 2.0 over stdin/stdout).
 * No external dependencies. Uses the Node.js range declared in package.json.
 *
 * Usage:
 *   node commander/mcp-server/index.js
 *
 * Or via package.json bin (after npm link):
 *   cc-commander mcp
 *
 * Wire into Claude Code / Cursor / Windsurf:
 *   .claude/mcp.json:
 *   {
 *     "commander": {
 *       "command": "node",
 *       "args": ["/path/to/commander/mcp-server/index.js"],
 *       "env": { "COMMANDER_LICENSE": "free" }
 *     }
 *   }
 */

var readline = require('readline');
var TOOLS = require('./tools');
var loader = require('./skills-loader');
var translator = require('./translator');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');

var pkg = require('../../package.json');
var isOffline = require('../cowork-plugin/lib/network-mode').isOffline;
var BRAND = require('../branding');

var SERVER_INFO = {
  name: 'commander',
  version: pkg.version,
};

var CAPABILITIES = {
  tools: {},
};

// ─── JSON-RPC helpers ──────────────────────────────────────────

function reply(id, result) {
  var msg = JSON.stringify({ jsonrpc: '2.0', id: id, result: result });
  process.stdout.write(msg + '\n');
}

function replyError(id, code, message) {
  var msg = JSON.stringify({ jsonrpc: '2.0', id: id, error: { code: code, message: message } });
  process.stdout.write(msg + '\n');
}

// ─── Tool Handlers ─────────────────────────────────────────────

function handleListSkills(args) {
  return loader.listSkills(args);
}

function handleGetSkill(args) {
  var skill = loader.getSkill(args.name);
  if (!skill) return { error: 'Skill not found: ' + args.name };
  return skill;
}

function handleSearch(args) {
  return { results: loader.searchSkills(args.query, args.limit) };
}

function handleSuggestFor(args) {
  return { suggestions: loader.suggestFor(args.task) };
}

function handleInvokeSkill(args) {
  var skill = loader.getSkill(args.name);
  if (!skill) return { error: 'Skill not found: ' + args.name, confidence: 0 };
  return {
    skill: args.name,
    content: skill.content,
    ...(skill.license ? { license: skill.license } : {}),
    context: args.context || '',
    confidence: 0.85,
    note: 'Local mode: skill content returned. Claude Code handles execution.',
  };
}

function handleListAgents(_args) {
  var agentsDir = path.join(__dirname, '..', 'cowork-plugin', 'agents');
  var agents = [];
  try {
    var entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    for (var entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      var name = entry.name.replace('.md', '');
      var tier = ['reviewer', 'builder', 'researcher', 'debugger', 'fleet-worker'].includes(name) ? 'pro' : 'free';
      agents.push({ name: name, tier: tier, path: path.join(agentsDir, entry.name) });
    }
  } catch (_) {}
  var args = _args || {};
  if (args.tier) agents = agents.filter(function(a) { return a.tier === args.tier; });
  return { agents: agents.map(function(a) { return { name: a.name, tier: a.tier }; }) };
}

function handleGetAgent(args) {
  var agentsDir = path.join(__dirname, '..', 'cowork-plugin', 'agents');
  var agentsDirResolved = path.resolve(agentsDir);
  var resolved = path.resolve(agentsDir, args.name + '.md');
  if (!resolved.startsWith(agentsDirResolved + path.sep)) {
    return { error: 'Agent not found: ' + args.name };
  }
  var agentPath = resolved;
  try {
    var content = fs.readFileSync(agentPath, 'utf8');
    return { name: args.name, content: content };
  } catch (_) {
    return { error: 'Agent not found: ' + args.name };
  }
}

function handleInvokeAgent(args) {
  return {
    agent: args.name,
    task: args.task,
    note: 'Local mode: use Claude Code /ccc-' + args.name + ' with the task context below.',
    dispatchHint: 'ccc --dispatch "' + args.task.replace(/"/g, '\\"') + '" --agent ' + args.name,
  };
}

function handleStatus(_args) {
  var configDir = path.join(os.homedir(), '.claude', 'commander');
  var license = 'free';
  var usage = 0;
  try { license = process.env.COMMANDER_LICENSE || 'free'; } catch (_) {}
  try {
    var usageFile = path.join(configDir, 'usage.json');
    if (fs.existsSync(usageFile)) {
      var data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      usage = data.callsThisMonth || 0;
    }
  } catch (_) {}

  return {
    version: pkg.version,
    license: license,
    usageThisMonth: usage,
    usageCap: license === 'pro' ? null : 1000,
    mode: 'local',
    skillCount: loader.listSkills({}).total,
  };
}

function handleUpdate(_args) {
  var checkPath = path.join(__dirname, '..', 'update-check.js');
  var checker;
  try {
    checker = require(checkPath);
  } catch (_) {
    return { currentVersion: pkg.version, latestVersion: null, note: 'Run: npm view cc-commander version' };
  }
  if (typeof checker.checkForUpdate !== 'function') {
    return { currentVersion: pkg.version, latestVersion: null, note: 'Run: npm view cc-commander version' };
  }
  // checkForUpdate() is async and applies the shared CCC_OFFLINE guard
  // (cowork-plugin/lib/network-mode.js) before any request; the router (see
  // handleRequest) awaits it before replying.
  return checker.checkForUpdate({ localVersion: pkg.version }).then(function (result) {
    var note;
    if (result.offline && result.status === 'unknown') note = 'Offline mode (CCC_OFFLINE or "offline": true): update check skipped, no request made.';
    else if (result.status === 'outdated') note = checker.remediationText();
    else if (result.status === 'unknown') note = 'Could not reach the update server — offline or rate-limited. Try again later.';
    else note = 'Up to date.';
    var out = {
      currentVersion: result.installed,
      latestVersion: result.latest,
      status: result.status,
      note: note,
    };
    if (result.offline) out.offline = true;
    return out;
  }).catch(function () {
    return { currentVersion: pkg.version, latestVersion: null, note: 'Update check failed.' };
  });
}

function handleInit(args) {
  var templatePath = path.join(__dirname, '..', '..', 'CLAUDE.md.template');
  var template = '';
  try { template = fs.readFileSync(templatePath, 'utf8'); } catch (_) { template = '# CLAUDE.md\n\nGenerated by CC Commander ' + pkg.version; }
  if (args.projectName) template = template.replace(/\{PROJECT_NAME\}/g, args.projectName);
  if (args.stack) template = template + '\n\n## Stack\n' + args.stack;
  return { content: template, projectName: args.projectName || 'my-project' };
}

// ─── Local record stores ───────────────────────────────────────
// Notes, plans and pushed tasks persist before a tool reports success. A
// failed read or write propagates as a tool error (isError) instead of a
// success response for a record that never landed. An unreadable store is
// never overwritten with an empty list.

function storeDir() {
  return path.join(os.homedir(), '.claude', 'commander');
}

function newRecordId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
}

function readStore(file) {
  var raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw new Error('Could not read ' + file + ': ' + err.message);
  }
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('Refusing to overwrite unreadable store ' + file + ': ' + err.message);
  }
  if (!Array.isArray(parsed)) throw new Error('Refusing to overwrite store ' + file + ': not a JSON array');
  return parsed;
}

/** Atomically write the list (temp file + rename), then confirm the record landed. */
function writeStore(file, records, id) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  var tmp = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(records, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw new Error('Could not save ' + file + ': ' + err.message);
  }
  var check = readStore(file);
  if (!check.some(function (r) { return r && r.id === id; })) throw new Error('Record ' + id + ' not found in ' + file + ' after write');
}

function appendRecord(fileName, record) {
  var file = path.join(storeDir(), fileName);
  var records = readStore(file);
  records.push(record);
  writeStore(file, records, record.id);
  return file;
}

function updateRecord(fileName, id, patch) {
  var file = path.join(storeDir(), fileName);
  var records = readStore(file);
  var found = false;
  records = records.map(function (r) {
    if (!r || r.id !== id) return r;
    found = true;
    return Object.assign({}, r, patch);
  });
  if (!found) throw new Error('Record ' + id + ' not found in ' + file);
  writeStore(file, records, id);
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' is required');
  return value;
}

function handleNotesPin(args) {
  var content = requireString(args.content, 'content');
  var note = {
    id: newRecordId('note'),
    content: content,
    tags: Array.isArray(args.tags) ? args.tags.filter(function (t) { return typeof t === 'string'; }) : [],
    pinnedAt: new Date().toISOString(),
  };
  var file = appendRecord('pinned-notes.json', note);
  return { pinned: true, id: note.id, store: file };
}

function handlePlanIntegrate(args) {
  var planText = requireString(args.plan, 'plan');
  var plan = {
    id: newRecordId('plan'),
    title: typeof args.title === 'string' && args.title.trim() ? args.title : 'Untitled Plan',
    plan: planText,
    importedAt: new Date().toISOString(),
  };
  var file = appendRecord('plans.json', plan);
  return { integrated: true, id: plan.id, title: plan.title, store: file };
}

/**
 * Linear availability without a network call: offline mode or a missing token
 * means the integration is not configured for this push.
 */
function linearAvailability() {
  if (isOffline(process.env)) return { available: false, reason: 'Offline mode (CCC_OFFLINE or "offline": true) is on.' };
  var linear;
  try {
    linear = deps.linear();
  } catch (err) {
    return { available: false, reason: 'Linear integration could not load: ' + err.message };
  }
  var authError = linear && typeof linear.validateAuth === 'function' ? linear.validateAuth() : { error: 'Linear integration unavailable.' };
  if (authError) return { available: false, reason: authError.error || 'Linear is not connected.' };
  return { available: true, linear: linear };
}

/**
 * Persist the task locally first (the retrievable record), then push it to
 * Linear when that integration is available. The response reports the
 * integration as not_configured, pushed or failed; it never claims a push
 * that did not happen.
 */
function handleTasksPush(args) {
  var title = requireString(args.title, 'title');
  var task = {
    id: newRecordId('task'),
    title: title,
    description: typeof args.description === 'string' ? args.description : '',
    priority: typeof args.priority === 'string' ? args.priority : null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    linear: null,
  };
  var file = appendRecord('tasks.json', task);
  var base = { queued: true, id: task.id, title: title, store: file };

  var avail = linearAvailability();
  if (!avail.available) {
    base.linear = { status: 'not_configured', note: avail.reason + ' Task saved locally only.' };
    return base;
  }
  return Promise.resolve()
    .then(function () { return avail.linear.quickCreateIssue(title, task.description); })
    .then(function (issue) {
      var linearInfo = { status: 'pushed', identifier: issue && issue.identifier, url: issue && issue.url, issueId: issue && issue.id };
      updateRecord('tasks.json', task.id, { linear: linearInfo });
      base.linear = linearInfo;
      return base;
    }, function (err) {
      var linearInfo = { status: 'failed', error: (err && err.message) || String(err) };
      updateRecord('tasks.json', task.id, { linear: linearInfo });
      base.linear = linearInfo;
      return base;
    });
}

// Test seam: integrations are resolved lazily so tests can substitute them.
var deps = {
  linear: function () { return require('../integrations/linear'); },
};

// ─── Tool dispatch map ─────────────────────────────────────────

var HANDLERS = {
  commander_list_skills: handleListSkills,
  commander_get_skill: handleGetSkill,
  commander_search: handleSearch,
  commander_suggest_for: handleSuggestFor,
  commander_invoke_skill: handleInvokeSkill,
  commander_list_agents: handleListAgents,
  commander_get_agent: handleGetAgent,
  commander_invoke_agent: handleInvokeAgent,
  commander_status: handleStatus,
  commander_update: handleUpdate,
  commander_init: handleInit,
  commander_notes_pin: handleNotesPin,
  commander_tasks_push: handleTasksPush,
  commander_plan_integrate: handlePlanIntegrate,
};

// ─── Request Router ────────────────────────────────────────────

/**
 * Route one JSON-RPC request and write its reply. Returns a Promise that
 * settles after the reply is written when a tool handler is async, so the
 * transport can wait for in-flight work before exiting.
 */
function handleRequest(req) {
  var id = req.id;
  var method = req.method;
  var params = req.params || {};

  if (method === 'initialize') {
    reply(id, {
      protocolVersion: '2024-11-05',
      capabilities: CAPABILITIES,
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    var toolName = params.name;
    var toolArgs = params.arguments || {};
    var handler = HANDLERS[toolName];
    if (!handler) {
      replyError(id, -32601, 'Tool not found: ' + toolName);
      return;
    }
    try {
      var result = handler(toolArgs);
      // A handful of handlers (e.g. commander_update) are async and return a
      // Promise — every other handler stays synchronous and unaffected.
      if (result && typeof result.then === 'function') {
        return result
          .then(function(resolved) { reply(id, translator.translateResult(toolName, resolved)); })
          .catch(function(err) { reply(id, translator.translateError(err)); });
      }
      reply(id, translator.translateResult(toolName, result));
    } catch (err) {
      reply(id, translator.translateError(err));
    }
    return;
  }

  if (method === 'ping') {
    reply(id, {});
    return;
  }

  // Unknown method — return method not found
  replyError(id, -32601, 'Method not found: ' + method);
}

// ─── Stdio transport ───────────────────────────────────────────

function main() {
  var pending = new Set();
  var rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', function(line) {
    line = line.trim();
    if (!line) return;
    try {
      var req = JSON.parse(line);
      var p = handleRequest(req);
      if (p && typeof p.then === 'function') {
        pending.add(p);
        p.then(function() { pending.delete(p); }, function() { pending.delete(p); });
      }
    } catch (_err) {
      // Parse error
      var errMsg = JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      process.stdout.write(errMsg + '\n');
    }
  });

  // Let in-flight async tool calls (update check, Linear push) reply first.
  rl.on('close', function() {
    Promise.allSettled(Array.from(pending)).then(function() { process.exit(0); });
  });

  // Signal readiness to stderr (not stdout — stdout is JSON-RPC only)
  process.stderr.write('[commander-mcp] CC Commander MCP Server v' + pkg.version + ' ready (local mode)\n');
}

if (require.main === module) main();

module.exports = {
  HANDLERS: HANDLERS,
  handleRequest: handleRequest,
  deps: deps,
};
