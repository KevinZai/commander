// CC Commander — /ccc-doctor diagnostic helpers
//
// Pure utilities: every function takes an explicit root path so tests can
// point at fixtures rather than the real ~/.claude state.
//
// Each `check*` returns a `Result`:
//   { category: string, status: 'ok'|'warn'|'fail', message: string, remediation?: string }
//
// `runDiagnostics(root, options)` runs all categories and returns Result[].

'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');

// --- helpers ----------------------------------------------------------------

function safeRead(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (_) {
    return null;
  }
}

function safeJson(p) {
  var raw = safeRead(p);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function exists(p) {
  try {
    fs.statSync(p);
    return true;
  } catch (_) {
    return false;
  }
}

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir).filter(function (f) { return f.endsWith(ext); });
  } catch (_) {
    return [];
  }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(function (entry) {
      return entry.isDirectory() && entry.name.charAt(0) !== '.';
    }).map(function (entry) {
      return entry.name;
    });
  } catch (_) {
    return [];
  }
}

function countFilesNamed(dir, filename) {
  var count = 0;
  function walk(current) {
    var entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_) {
      return;
    }
    entries.forEach(function (entry) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'vendor') return;
      var full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === filename) {
        count++;
      }
    });
  }
  walk(dir);
  return count;
}

function ok(category, message) {
  return { category: category, status: 'ok', message: message };
}

function warn(category, message, remediation) {
  return { category: category, status: 'warn', message: message, remediation: remediation };
}

function fail(category, message, remediation) {
  return { category: category, status: 'fail', message: message, remediation: remediation };
}

// --- 0. Claude settings -----------------------------------------------------

function settingsPathFromOptions(options) {
  var homeDir = options && options.homeDir ? options.homeDir : process.env.HOME;
  return path.join(homeDir || '', '.claude', 'settings.json');
}

function checkClaudeTeamsFlag(root, options) {
  var settingsPath = settingsPathFromOptions(options);
  var settings = safeJson(settingsPath);
  if (!settings) {
    return warn(
      'claude-teams-flag',
      'Could not read ~/.claude/settings.json; CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS not verified',
      'Set env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS to "1" in ~/.claude/settings.json.'
    );
  }
  var env = settings.env || {};
  if (env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
    return ok('claude-teams-flag', 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in ~/.claude/settings.json');
  }
  return warn(
    'claude-teams-flag',
    'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is not "1" in ~/.claude/settings.json',
    'Set env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS to "1" for multi-agent fan-out.'
  );
}

var VALID_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'];

function checkEffortDefault(root, options) {
  var settingsPath = settingsPathFromOptions(options);
  var settings = safeJson(settingsPath);
  if (!settings) {
    return warn(
      'effort-default',
      'Could not read ~/.claude/settings.json; effortLevel inherits harness default'
    );
  }
  if (settings.effortLevel) {
    if (VALID_EFFORT_LEVELS.indexOf(settings.effortLevel) === -1) {
      return warn(
        'effort-default',
        'effortLevel=' + settings.effortLevel + ' in ~/.claude/settings.json is not a valid level',
        'Valid levels are: ' + VALID_EFFORT_LEVELS.join(', ') + '. Fix the typo or invalid value in ~/.claude/settings.json.'
      );
    }
    return ok('effort-default', 'effortLevel=' + settings.effortLevel + ' in ~/.claude/settings.json');
  }
  return ok('effort-default', 'effortLevel absent in ~/.claude/settings.json; inherits harness default');
}

// --- 1. License-tier cleanup verification -----------------------------------

var LICENSE_PATTERNS = [
  /license\.json/,
  /licenseFile/,
  /tier\s*===\s*['"]free['"]/,
  /isPro\s*\(\s*\)/,
];

function checkLicenseCleanup(root) {
  var hooksDir = path.join(root, 'commander', 'cowork-plugin', 'hooks');
  var files = listFiles(hooksDir, '.js');
  var hits = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var content = safeRead(path.join(hooksDir, file));
    if (!content) continue;
    for (var j = 0; j < LICENSE_PATTERNS.length; j++) {
      if (LICENSE_PATTERNS[j].test(content)) {
        hits.push(file + ' matches ' + LICENSE_PATTERNS[j].toString());
        break;
      }
    }
  }
  if (hits.length === 0) {
    return ok('license-cleanup', 'No license-tier residue in ' + files.length + ' hook files');
  }
  return fail(
    'license-cleanup',
    'Found ' + hits.length + ' hook(s) with license-tier residue: ' + hits.join('; '),
    'Remove license.json/isPro/tier gates — CC Commander\'s core is free forever (commit c3007dc).'
  );
}

// --- 2. Hook-chain health ---------------------------------------------------

// Files that may live in hooks/ but aren't in hooks.json (acceptable dormant utilities).
// _archive/permission-denied.js: superseded by permission-denied-logger.js; kept, never run.
var DORMANT_HOOK_ALLOWLIST = ['README.md', '_archive/permission-denied.js'];

var ORCHESTRATOR_REL = path.join('orchestrator', 'session-start-orchestrator.js');

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Handlers the SessionStart orchestrator imports ({ file: '../x.js' } entries),
 * as paths relative to hooksDir ('fable-armed-nudge.js', '_archive/session-start.js').
 */
function orchestratorHandlers(hooksDir) {
  var content = safeRead(path.join(hooksDir, ORCHESTRATOR_REL));
  if (!content) return [];
  var orchestratorDir = path.dirname(path.join(hooksDir, ORCHESTRATOR_REL));
  var out = [];
  var re = /\bfile:\s*['"]([^'"]+\.js)['"]/g;
  var m;
  var body = stripComments(content);
  while ((m = re.exec(body)) !== null) {
    out.push(path.relative(hooksDir, path.resolve(orchestratorDir, m[1])).split(path.sep).join('/'));
  }
  return out;
}

// A literal ~/.claude/commander path: join(..., '.claude', 'commander') or a
// "<home>/.claude/commander" string. Hooks must use lib/lane-state.js instead.
var SHARED_STATE_PATTERNS = [
  /['"`]\.claude['"`]\s*,\s*['"`]commander['"`]/,
  /\$\{[^}]*\}\/\.claude\/commander/,
  /['"`]\/\.claude\/commander/,
];

/**
 * Live hook code that builds the shared ~/.claude/commander path instead of the
 * lane state dir: hooks/*.js, hooks/lib/*.mjs, the orchestrator and the
 * _archive handlers it still imports. Returns sorted relative paths.
 */
function findSharedStateWriters(hooksDir) {
  var files = listFiles(hooksDir, '.js')
    .concat(listFiles(path.join(hooksDir, 'lib'), '.mjs').map(function (f) { return 'lib/' + f; }))
    .concat(listFiles(path.join(hooksDir, 'orchestrator'), '.js').map(function (f) { return 'orchestrator/' + f; }))
    .concat(orchestratorHandlers(hooksDir));
  var seen = {};
  return files.filter(function (rel) {
    if (seen[rel]) return false;
    seen[rel] = true;
    var content = safeRead(path.join(hooksDir, rel));
    if (!content) return false;
    var code = stripComments(content);
    return SHARED_STATE_PATTERNS.some(function (re) { return re.test(code); });
  }).sort();
}

/**
 * Hook-chain facts for one plugin hooks dir. A handler is registered when
 * hooks.json runs it or the SessionStart orchestrator imports it.
 * Returns {loadable, manifestPath, registered[], unregistered[], missing[],
 * legacyRequire[], noEsm[]} with paths relative to hooksDir. loadable is false
 * when hooks.json is missing or unparseable.
 */
// hooks.json shape Claude Code loads: {hooks: {<event>: [{hooks: [{command}]}]}}.
function wellFormedManifest(manifest) {
  if (!manifest || typeof manifest.hooks !== 'object' || manifest.hooks === null || Array.isArray(manifest.hooks)) return false;
  return Object.keys(manifest.hooks).every(function (event) {
    var groups = manifest.hooks[event];
    return Array.isArray(groups) && groups.every(function (g) {
      return g && typeof g === 'object' && Array.isArray(g.hooks) && g.hooks.every(function (h) {
        if (!h || typeof h !== 'object' || typeof h.type !== 'string') return false;
        // A command handler needs a non-empty command string; other handler types carry their own fields.
        return h.type !== 'command' || (typeof h.command === 'string' && h.command.trim() !== '');
      });
    });
  });
}

function hookChainReport(hooksDir) {
  var manifestPath = path.join(hooksDir, 'hooks.json');
  var manifest = safeJson(manifestPath);
  var report = {
    loadable: wellFormedManifest(manifest),
    manifestPath: manifestPath,
    registered: [],
    unregistered: [],
    missing: [],
    legacyRequire: [],
    noEsm: [],
  };
  if (!report.loadable) return report;

  var referenced = new Set();
  Object.keys(manifest.hooks).forEach(function (event) {
    var groups = manifest.hooks[event] || [];
    groups.forEach(function (g) {
      (g.hooks || []).forEach(function (h) {
        var m = h.command && h.command.match(/hooks\/([^\s'"]+\.js)/);
        if (m) referenced.add(m[1]);
      });
    });
  });
  // Handlers the orchestrator imports run on SessionStart without their own hooks.json entry.
  if (referenced.has(ORCHESTRATOR_REL.split(path.sep).join('/'))) {
    orchestratorHandlers(hooksDir).forEach(function (rel) { referenced.add(rel); });
  }

  referenced.forEach(function (rel) {
    var p = path.join(hooksDir, rel);
    if (!exists(p)) {
      report.missing.push(rel);
      return;
    }
    // Strip comments before scanning so prose mentions don't trigger.
    var stripped = stripComments(safeRead(p) || '');
    if (/^\s*(?:const|var|let)\s+[\w{},\s]+\s*=\s*require\s*\(/m.test(stripped)) report.legacyRequire.push(rel);
    if (!/^\s*import\s+/m.test(stripped)) report.noEsm.push(rel);
  });
  report.registered = Array.from(referenced).filter(function (rel) {
    return report.missing.indexOf(rel) === -1;
  }).sort();

  // Shipped handler files (hooks/*.js and hooks/_archive/*.js) nothing registers.
  var onDisk = listFiles(hooksDir, '.js')
    .concat(listFiles(path.join(hooksDir, '_archive'), '.js').map(function (f) { return '_archive/' + f; }));
  report.unregistered = onDisk.filter(function (f) {
    return !referenced.has(f) && DORMANT_HOOK_ALLOWLIST.indexOf(f) === -1;
  }).sort();
  return report;
}

function checkHookChain(root) {
  var hooksDir = path.join(root, 'commander', 'cowork-plugin', 'hooks');
  var report = hookChainReport(hooksDir);
  if (!report.loadable) {
    return fail(
      'hook-chain',
      'hooks.json missing, unparseable or malformed at ' + report.manifestPath,
      'Restore hooks.json from a known-good commit.'
    );
  }

  var problems = []
    .concat(report.missing.map(function (rel) { return 'missing: ' + rel; }))
    .concat(report.legacyRequire.map(function (rel) { return 'legacy require(): ' + rel; }))
    .concat(report.noEsm.map(function (rel) { return 'no ESM import: ' + rel; }));
  if (report.unregistered.length > 0) {
    problems.push('unregistered: ' + report.unregistered.join(', '));
  }

  if (problems.length === 0) {
    return ok('hook-chain', 'All ' + report.registered.length + ' referenced hooks present + ESM');
  }
  return fail(
    'hook-chain',
    'Hook-chain issues: ' + problems.join('; '),
    'Either register the file in hooks.json, add it to the dormant allowlist, or migrate require() → import.'
  );
}

// --- 3. MCP availability ----------------------------------------------------

var EXPECTED_MCP_SERVERS = ['context7', 'sequential-thinking'];
var EXPECTED_CONNECTOR_COUNT = 16;

// --- Connector counts: one source for `ccc doctor` and `ccc checkin` --------

/**
 * Rows in the opt-in MCP catalog table (the table whose header starts with
 * "| MCP |") in CONNECTORS.md text. null when the text or the table is missing,
 * so a renamed heading or a broken table reads as unknown, never as 0.
 */
function countCatalogConnectors(markdown) {
  if (typeof markdown !== 'string') return null;
  var lines = markdown.split('\n').map(function (l) { return l.trim(); });
  var head = -1;
  for (var i = 0; i < lines.length; i++) {
    if (/^\|\s*MCP\s*\|/i.test(lines[i])) { head = i; break; }
  }
  if (head < 0 || !/^\|[-:\s|]+\|$/.test(lines[head + 1] || '')) return null;
  var n = 0;
  for (var j = head + 2; j < lines.length && lines[j].charAt(0) === '|'; j++) n++;
  return n;
}

/** Claude Code's user config file for a lane: <config dir>/.claude.json, or ~/.claude.json for the default dir. */
function claudeUserConfigFile(env) {
  env = env || process.env;
  var dir = env.CCC_CONFIG_DIR || env.CLAUDE_CONFIG_DIR;
  return dir ? path.join(path.resolve(dir), '.claude.json') : path.join(env.HOME || os.homedir(), '.claude.json');
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// Server count of an {mcpServers} holder: 0 when the holder or its mcpServers
// is absent, null when either is present but not an object.
function serverCount(holder) {
  if (holder === undefined) return 0;
  if (!isPlainObject(holder)) return null;
  if (holder.mcpServers === undefined) return 0;
  var m = holder.mcpServers;
  return m && typeof m === 'object' && !Array.isArray(m) ? Object.keys(m).length : null;
}

// {state: 'absent'|'bad'|'ok', json}
function readConfig(file) {
  var raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { state: e.code === 'ENOENT' ? 'absent' : 'bad' }; }
  try {
    var json = JSON.parse(raw);
    return json && typeof json === 'object' && !Array.isArray(json) ? { state: 'ok', json: json } : { state: 'bad' };
  } catch (_) { return { state: 'bad' }; }
}

/**
 * MCP servers configured for a lane, by Claude Code scope: user (top-level
 * mcpServers in the lane's .claude.json), local (that file's projects[cwd])
 * and project (<cwd>/.mcp.json). A missing file counts 0; an unreadable or
 * malformed one is null (unknown), and then total is null too.
 * opts: {env, cwd}. Only names are counted; values are never read out.
 */
function countConfiguredConnectors(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var cwd = path.resolve(opts.cwd || process.cwd());
  var userFile = claudeUserConfigFile(env);
  var user = readConfig(userFile);
  var project = readConfig(path.join(cwd, '.mcp.json'));
  var counts = {
    user: user.state === 'bad' ? null : user.state === 'absent' ? 0 : serverCount(user.json),
    local: user.state === 'bad' ? null : user.state === 'absent' ? 0
      : user.json.projects === undefined ? 0
        : isPlainObject(user.json.projects) ? serverCount(user.json.projects[cwd]) : null,
    project: project.state === 'bad' ? null : project.state === 'absent' ? 0 : serverCount(project.json),
  };
  var known = counts.user !== null && counts.local !== null && counts.project !== null;
  return {
    user: counts.user,
    local: counts.local,
    project: counts.project,
    total: known ? counts.user + counts.local + counts.project : null,
    user_file: userFile,
  };
}

function describeConfigured(c) {
  var part = function (n) { return n === null ? 'unknown' : String(n); };
  return 'configured: ' + part(c.total) + ' (user ' + part(c.user) + ', local ' + part(c.local) + ', project ' + part(c.project) + ')';
}

function checkMcpAvailability(root, options) {
  options = options || {};
  var mcpPath = path.join(root, 'commander', 'cowork-plugin', '.mcp.json');
  var mcp = safeJson(mcpPath);
  if (!mcp || !mcp.mcpServers) {
    return fail(
      'mcp-availability',
      '.mcp.json missing or unparseable at ' + mcpPath,
      'Restore .mcp.json with the 2 bundled servers (context7 + sequential-thinking).'
    );
  }
  var names = Object.keys(mcp.mcpServers).sort();
  var expected = EXPECTED_MCP_SERVERS.slice().sort();
  var driftMcp = names.length !== expected.length ||
    names.some(function (n, i) { return n !== expected[i]; });

  var catalog = countCatalogConnectors(safeRead(path.join(root, 'commander', 'cowork-plugin', 'CONNECTORS.md')));
  var configured = countConfiguredConnectors({ env: options.env, cwd: options.cwd });
  var summary = 'opt-in connectors: ' + (catalog === null ? 'unknown' : catalog) + ' · ' + describeConfigured(configured);

  var msgs = [];
  if (driftMcp) {
    msgs.push('bundled MCP drift — found [' + names.join(',') + '], expected [' + expected.join(',') + ']');
  }
  if (catalog === null) {
    msgs.push('connector catalog unknown — no "| MCP |" table in CONNECTORS.md');
  } else if (catalog !== EXPECTED_CONNECTOR_COUNT) {
    msgs.push('connector count drift — found ' + catalog + ', expected ' + EXPECTED_CONNECTOR_COUNT);
  }
  if (configured.total === null) {
    msgs.push('configured MCP servers unknown — ' + configured.user_file + ' or .mcp.json is unreadable or malformed');
  }
  if (msgs.length === 0) {
    return ok('mcp-availability', 'Bundled MCP: ' + names.join(', ') + ' · ' + summary);
  }
  return warn(
    'mcp-availability',
    msgs.join('; ') + ' (' + summary + ')',
    'Reconcile .mcp.json or CONNECTORS.md with canonical claim (2 bundled + ' + EXPECTED_CONNECTOR_COUNT + ' opt-in), and fix any malformed MCP config.'
  );
}

// --- 3b. Product contract integrity ----------------------------------------

function checkContractIntegrity(root) {
  var contractPath = path.join(root, 'commander', 'contract.json');
  var contract = safeJson(contractPath);
  if (!contract) {
    return fail(
      'contract-integrity',
      'contract.json missing or unparseable at ' + contractPath,
      'Restore commander/contract.json before release.'
    );
  }

  var hooks = safeJson(path.join(root, 'commander', 'cowork-plugin', 'hooks', 'hooks.json'));
  var mcp = safeJson(path.join(root, 'commander', 'cowork-plugin', '.mcp.json'));
  var actual = {
    plugin_skills: countFilesNamed(path.join(root, 'commander', 'cowork-plugin', 'skills'), 'SKILL.md'),
    specialist_agents: listFiles(path.join(root, 'commander', 'cowork-plugin', 'agents'), '.md').length,
    lifecycle_hooks: hooks && hooks.hooks ? Object.keys(hooks.hooks).length : null,
    bundled_mcp_servers: mcp && mcp.mcpServers ? Object.keys(mcp.mcpServers).length : null,
  };
  var problems = [];
  Object.keys(actual).forEach(function (field) {
    if (actual[field] === null) {
      problems.push(field + ': unable to count');
    } else if (contract[field] !== actual[field]) {
      problems.push(field + ': contract=' + contract[field] + ' actual=' + actual[field]);
    }
  });

  if (problems.length === 0) {
    return ok(
      'contract-integrity',
      'contract counts match filesystem: ' +
        'skills=' + actual.plugin_skills +
        ', agents=' + actual.specialist_agents +
        ', hook events=' + actual.lifecycle_hooks +
        ', bundled MCP=' + actual.bundled_mcp_servers
    );
  }
  return fail(
    'contract-integrity',
    'Contract count drift: ' + problems.join('; '),
    'Update generated assets or reconcile source files before changing contract.json.'
  );
}

// --- 3c. Vendor submodule count --------------------------------------------

function readClaudeVendorClaim(root) {
  var content = safeRead(path.join(root, 'CLAUDE.md'));
  if (!content) return null;
  var matches = content.match(/(\d+)\s+vendor(?:\s+submodules|\s+packages)?/gi);
  if (!matches || matches.length === 0) return null;
  var last = matches[matches.length - 1].match(/\d+/);
  return last ? Number(last[0]) : null;
}

function checkVendorSubmodules(root) {
  var contract = safeJson(path.join(root, 'commander', 'contract.json')) || {};
  var actual = listDirs(path.join(root, 'vendor')).length;
  var claudeClaim = readClaudeVendorClaim(root);
  var contractClaim = typeof contract.vendor_submodules === 'number' ? contract.vendor_submodules : null;
  var problems = [];

  if (contractClaim !== null && contractClaim !== actual) {
    problems.push('contract.json vendor_submodules=' + contractClaim + ' actual=' + actual);
  }
  if (claudeClaim !== null && claudeClaim !== actual) {
    problems.push('CLAUDE.md vendor claim=' + claudeClaim + ' actual=' + actual);
  }

  if (problems.length > 0) {
    return warn(
      'vendor-submodules',
      'Vendor count drift: ' + problems.join('; '),
      'Reconcile vendor/ with product claims; do not edit vendor submodules from tuneup.'
    );
  }

  var parts = ['actual=' + actual];
  parts.push('CLAUDE.md=' + (claudeClaim === null ? 'n/a' : claudeClaim));
  parts.push('contract.json=' + (contractClaim === null ? 'n/a' : contractClaim));
  return ok('vendor-submodules', 'Vendor submodule count aligned (' + parts.join(', ') + ')');
}

// --- 3d. Bundled MCP contract ----------------------------------------------

function checkBundledMcpServers(root) {
  var contract = safeJson(path.join(root, 'commander', 'contract.json')) || {};
  var mcpPath = path.join(root, 'commander', 'cowork-plugin', '.mcp.json');
  var mcp = safeJson(mcpPath);
  if (!mcp || !mcp.mcpServers) {
    return fail(
      'bundled-mcp-servers',
      '.mcp.json missing or unparseable at ' + mcpPath,
      'Restore commander/cowork-plugin/.mcp.json.'
    );
  }
  var names = Object.keys(mcp.mcpServers).sort();
  var expectedCount = contract.bundled_mcp_servers;
  if (typeof expectedCount === 'number' && names.length !== expectedCount) {
    return warn(
      'bundled-mcp-servers',
      '.mcp.json lists ' + names.length + ' bundled MCP servers, contract expects ' + expectedCount + ': ' + names.join(', '),
      'Reconcile .mcp.json with commander/contract.json.'
    );
  }
  return ok('bundled-mcp-servers', '.mcp.json parses and lists ' + names.length + ' bundled MCP servers: ' + names.join(', '));
}

// --- 4. Sub-agent model pin check -------------------------------------------

// v8 routing table (commander/tests/agent-personas.test.js pins the same):
// aliases track the newest model in each line, so an alias or the current
// full id is correct; an older pinned id is an upgrade candidate.
var EXPECTED_FABLE_AGENTS = ['architect', 'security-auditor'];
var EXPECTED_SONNET_AGENTS = ['technical-writer', 'content-strategist', 'fleet-worker'];
var ACCEPTED_MODELS = {
  fable: ['fable', 'claude-fable-5-1'],
  opus: ['opus', 'claude-opus-5-5'],
  sonnet: ['sonnet', 'claude-sonnet-5-5'],
};
var LEGACY_MODEL_IDS = /^claude-(fable-5|opus-5|sonnet-5|haiku-4-5|opus-4-\d|sonnet-4-\d)$/;

function expectedTierFor(name) {
  if (EXPECTED_FABLE_AGENTS.indexOf(name) >= 0) return 'fable';
  if (EXPECTED_SONNET_AGENTS.indexOf(name) >= 0) return 'sonnet';
  return 'opus';
}

function readAgentModel(filePath) {
  var content = safeRead(filePath);
  if (!content) return null;
  var fmEnd = content.indexOf('---', 3);
  if (fmEnd < 0) return null;
  var fm = content.slice(3, fmEnd);
  var m = fm.match(/^model:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

function checkAgentModels(root) {
  var agentsDir = path.join(root, 'commander', 'cowork-plugin', 'agents');
  var files = listFiles(agentsDir, '.md');
  if (files.length === 0) {
    return fail('agent-models', 'No agent .md files found at ' + agentsDir);
  }
  var rows = [];
  var problems = [];
  for (var i = 0; i < files.length; i++) {
    var name = files[i].replace(/\.md$/, '');
    var model = readAgentModel(path.join(agentsDir, files[i]));
    rows.push(name + '=' + (model || 'MISSING'));
    if (!model) {
      problems.push(name + ': missing model field');
      continue;
    }
    if (LEGACY_MODEL_IDS.test(model)) continue; // reported below as an upgrade candidate
    var tier = expectedTierFor(name);
    if (ACCEPTED_MODELS[tier].indexOf(model) < 0) {
      problems.push(name + ': expected ' + tier + ' (' + ACCEPTED_MODELS[tier].join(' or ') + '), got ' + model);
    }
  }
  // Upgrade candidates: any agent still pinned to a superseded model id
  var upgradeCandidates = [];
  rows.forEach(function (r) {
    var parts = r.split('=');
    if (LEGACY_MODEL_IDS.test(parts[1])) {
      upgradeCandidates.push(parts[0]);
    }
  });

  if (problems.length > 0) {
    return fail(
      'agent-models',
      'Agent model routing issues: ' + problems.join('; '),
      'Set each agent frontmatter `model:` to its v8 alias (fable, opus or sonnet).'
    );
  }
  if (upgradeCandidates.length > 0) {
    return warn(
      'agent-models',
      'Upgrade candidates on legacy aliases: ' + upgradeCandidates.join(', '),
      'Use the v8 alias (sonnet, opus, fable) or the current id (e.g. claude-sonnet-5-5); superseded ids drift as models retire.'
    );
  }
  return ok('agent-models', 'All ' + files.length + ' agents on explicit model pins');
}

// --- 5. Test suite health ---------------------------------------------------

var REQUIRED_AUDIT_SCRIPTS = [
  'scripts/audit-frontmatter.js',
  'scripts/audit-counts.js',
  'scripts/check-version-parity.js',
];

function checkTestSuiteHealth(root) {
  var missing = REQUIRED_AUDIT_SCRIPTS.filter(function (rel) {
    return !exists(path.join(root, rel));
  });
  if (missing.length > 0) {
    return fail(
      'test-suite',
      'Missing audit scripts: ' + missing.join(', '),
      'Restore the missing audit scripts from main.'
    );
  }
  return ok(
    'test-suite',
    REQUIRED_AUDIT_SCRIPTS.length + ' audit scripts present (run with --check)'
  );
}

// --- 6. displayName presence ------------------------------------------------

function checkDisplayName(root) {
  var pluginPath = path.join(root, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json');
  var marketplacePath = path.join(root, '.claude-plugin', 'marketplace.json');
  var pluginJson = safeJson(pluginPath);
  var marketplaceJson = safeJson(marketplacePath);
  var problems = [];
  if (!pluginJson) {
    problems.push('plugin.json unreadable');
  } else if (pluginJson.displayName !== 'Commander') {
    problems.push('plugin.json.displayName=' + JSON.stringify(pluginJson.displayName) + ' (expected "Commander")');
  }
  if (!marketplaceJson) {
    problems.push('marketplace.json unreadable');
  } else {
    var first = marketplaceJson.plugins && marketplaceJson.plugins[0];
    if (!first || first.displayName !== 'Commander') {
      problems.push('marketplace.json.plugins[0].displayName=' + JSON.stringify(first && first.displayName) + ' (expected "Commander")');
    }
  }
  if (problems.length === 0) {
    return ok('display-name', 'displayName="Commander" set in plugin.json + marketplace.json');
  }
  return fail(
    'display-name',
    problems.join('; '),
    'Set displayName to "Commander" per brand commit 0954a3a.'
  );
}

// --- 7. Version parity (spot check package.json vs plugin.json) -------------

function checkVersionParity(root) {
  var pkg = safeJson(path.join(root, 'package.json'));
  var plugin = safeJson(path.join(root, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'));
  if (!pkg || !plugin) {
    return fail(
      'version-parity',
      'Could not read package.json or plugin.json',
      'Restore manifests then re-run.'
    );
  }
  if (pkg.version !== plugin.version) {
    return fail(
      'version-parity',
      'Drift: package.json=' + pkg.version + ' plugin.json=' + plugin.version,
      'Run `node scripts/bump-version.js ' + pkg.version + '` to sync all manifests.'
    );
  }
  return ok('version-parity', 'package.json + plugin.json both at ' + pkg.version);
}

// --- 8. Critical file presence ----------------------------------------------

var CRITICAL_FILES = [
  'CHANGELOG.md',
  'README.md',
  'LICENSE',
  'package.json',
  'commander/core/registry.yaml',
];

function checkCriticalFiles(root) {
  var missing = CRITICAL_FILES.filter(function (rel) {
    return !exists(path.join(root, rel));
  });
  if (missing.length === 0) {
    return ok('critical-files', 'All ' + CRITICAL_FILES.length + ' critical files present');
  }
  return fail(
    'critical-files',
    'Missing critical files: ' + missing.join(', '),
    'Restore missing files from a known-good commit.'
  );
}

// --- Network mode -----------------------------------------------------------

/**
 * Informational: which outbound switches are on (lib/network-mode.js reads
 * CCC_TELEMETRY / CCC_OFFLINE / CCC_CI_TICKER and ~/.commander/config.json).
 * options.env and options.homeDir let tests pin both.
 */
function checkNetworkMode(root, options) {
  var networkMode = require('../../../lib/network-mode').networkMode;
  var env = options && options.env ? options.env : process.env;
  var mode = networkMode(env, { homeDir: options && options.homeDir });
  var onOff = function (b) { return b ? 'on' : 'off'; };
  return ok(
    'network-mode',
    'telemetry ' + onOff(mode.telemetry) + ' · offline ' + onOff(mode.offline) + ' · ci-ticker ' + onOff(mode.ciTicker)
  );
}

// --- runner -----------------------------------------------------------------

function runDiagnostics(root, options) {
  var r = root || path.resolve(__dirname, '..', '..', '..', '..', '..');
  return [
    checkClaudeTeamsFlag(r, options),
    checkEffortDefault(r, options),
    checkLicenseCleanup(r),
    checkHookChain(r),
    checkMcpAvailability(r, options),
    checkContractIntegrity(r),
    checkVendorSubmodules(r),
    checkBundledMcpServers(r),
    checkAgentModels(r),
    checkTestSuiteHealth(r),
    checkDisplayName(r),
    checkVersionParity(r),
    checkCriticalFiles(r),
    checkNetworkMode(r, options),
  ];
}

module.exports = {
  runDiagnostics: runDiagnostics,
  checkClaudeTeamsFlag: checkClaudeTeamsFlag,
  checkEffortDefault: checkEffortDefault,
  checkLicenseCleanup: checkLicenseCleanup,
  checkHookChain: checkHookChain,
  hookChainReport: hookChainReport,
  DORMANT_HOOK_ALLOWLIST: DORMANT_HOOK_ALLOWLIST,
  orchestratorHandlers: orchestratorHandlers,
  findSharedStateWriters: findSharedStateWriters,
  checkMcpAvailability: checkMcpAvailability,
  countCatalogConnectors: countCatalogConnectors,
  countConfiguredConnectors: countConfiguredConnectors,
  claudeUserConfigFile: claudeUserConfigFile,
  checkContractIntegrity: checkContractIntegrity,
  checkVendorSubmodules: checkVendorSubmodules,
  checkBundledMcpServers: checkBundledMcpServers,
  checkAgentModels: checkAgentModels,
  checkTestSuiteHealth: checkTestSuiteHealth,
  checkDisplayName: checkDisplayName,
  checkVersionParity: checkVersionParity,
  checkCriticalFiles: checkCriticalFiles,
  checkNetworkMode: checkNetworkMode,
  EXPECTED_MCP_SERVERS: EXPECTED_MCP_SERVERS,
  EXPECTED_CONNECTOR_COUNT: EXPECTED_CONNECTOR_COUNT,
};
