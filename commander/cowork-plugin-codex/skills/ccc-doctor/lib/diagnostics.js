// CC Commander — /ccc-doctor diagnostic helpers
//
// Pure utilities: every function takes an explicit root path so tests can
// point at fixtures rather than the real ~/.claude state.
//
// Each `check*` returns a `Result`:
//   { category: string, status: 'ok'|'warn'|'fail', message: string, remediation?: string }
//
// `runDiagnostics(root)` runs all 8 categories and returns Result[].

'use strict';

var fs = require('fs');
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

function ok(category, message) {
  return { category: category, status: 'ok', message: message };
}

function warn(category, message, remediation) {
  return { category: category, status: 'warn', message: message, remediation: remediation };
}

function fail(category, message, remediation) {
  return { category: category, status: 'fail', message: message, remediation: remediation };
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
    'Remove license.json/isPro/tier gates — CC Commander is free forever (commit c3007dc).'
  );
}

// --- 2. Hook-chain health ---------------------------------------------------

// Files that may live in hooks/ but aren't in hooks.json (acceptable dormant utilities).
var DORMANT_HOOK_ALLOWLIST = ['README.md'];

function checkHookChain(root) {
  var hooksDir = path.join(root, 'commander', 'cowork-plugin', 'hooks');
  var manifestPath = path.join(hooksDir, 'hooks.json');
  var manifest = safeJson(manifestPath);
  if (!manifest || !manifest.hooks) {
    return fail(
      'hook-chain',
      'hooks.json missing or unparseable at ' + manifestPath,
      'Restore hooks.json from a known-good commit.'
    );
  }
  // Collect referenced .js paths from manifest
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

  var problems = [];
  // Each referenced file exists + uses ESM import (not require)
  referenced.forEach(function (rel) {
    var p = path.join(hooksDir, rel);
    if (!exists(p)) {
      problems.push('missing: ' + rel);
      return;
    }
    var content = safeRead(p) || '';
    // Strip block + line comments before scanning so prose mentions don't trigger.
    var stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (/^\s*(?:const|var|let)\s+[\w{},\s]+\s*=\s*require\s*\(/m.test(stripped)) {
      problems.push('legacy require(): ' + rel);
    }
    if (!/^\s*import\s+/m.test(stripped)) {
      problems.push('no ESM import: ' + rel);
    }
  });

  // Unregistered .js files in hooks/ that aren't in dormant allowlist
  var onDisk = listFiles(hooksDir, '.js');
  var unregistered = onDisk.filter(function (f) {
    return !referenced.has(f) && DORMANT_HOOK_ALLOWLIST.indexOf(f) === -1;
  });
  if (unregistered.length > 0) {
    problems.push('unregistered: ' + unregistered.join(', '));
  }

  if (problems.length === 0) {
    return ok('hook-chain', 'All ' + referenced.size + ' referenced hooks present + ESM');
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

function checkMcpAvailability(root) {
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

  // Count opt-in connectors in CONNECTORS.md MCP catalog
  var connectorsPath = path.join(root, 'commander', 'cowork-plugin', 'CONNECTORS.md');
  var connectors = safeRead(connectorsPath);
  var connectorRows = 0;
  var driftConnectors = false;
  if (connectors) {
    // Find the "Recommended MCP Servers" table and count data rows
    var idx = connectors.indexOf('Recommended MCP Servers');
    if (idx >= 0) {
      var section = connectors.slice(idx);
      var lines = section.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        // Skip header + separator + non-table lines
        if (!line.startsWith('|')) continue;
        if (/^\|\s*MCP\s*\|/i.test(line)) continue;
        if (/^\|[-\s|]+\|$/.test(line)) continue;
        connectorRows++;
      }
    }
    driftConnectors = connectorRows !== EXPECTED_CONNECTOR_COUNT;
  } else {
    driftConnectors = true;
  }

  if (!driftMcp && !driftConnectors) {
    return ok(
      'mcp-availability',
      'Bundled MCP: ' + names.join(', ') + ' · opt-in connectors: ' + connectorRows
    );
  }
  var msgs = [];
  if (driftMcp) {
    msgs.push('bundled MCP drift — found [' + names.join(',') + '], expected [' + expected.join(',') + ']');
  }
  if (driftConnectors) {
    msgs.push('connector count drift — found ' + connectorRows + ', expected ' + EXPECTED_CONNECTOR_COUNT);
  }
  return warn(
    'mcp-availability',
    msgs.join('; '),
    'Reconcile .mcp.json or CONNECTORS.md with canonical claim (2 bundled + ' + EXPECTED_CONNECTOR_COUNT + ' opt-in).'
  );
}

// --- 4. Sub-agent model pin check -------------------------------------------

var EXPECTED_OPUS_AGENTS = ['architect', 'security-auditor', 'debugger', 'product-manager'];
var EXPECTED_SONNET_PINNED = ['designer', 'researcher', 'reviewer'];
var LEGACY_ALIASES = ['opus', 'sonnet', 'haiku'];

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
    if (EXPECTED_OPUS_AGENTS.indexOf(name) >= 0 && model !== 'claude-opus-4-7') {
      problems.push(name + ': expected claude-opus-4-7, got ' + model);
    }
    if (EXPECTED_SONNET_PINNED.indexOf(name) >= 0 && model !== 'claude-sonnet-4-6') {
      problems.push(name + ': expected claude-sonnet-4-6, got ' + model);
    }
  }
  // Upgrade candidates: any agent on a legacy alias instead of explicit pin
  var upgradeCandidates = [];
  rows.forEach(function (r) {
    var parts = r.split('=');
    if (LEGACY_ALIASES.indexOf(parts[1]) >= 0) {
      upgradeCandidates.push(parts[0]);
    }
  });

  if (problems.length > 0) {
    return fail(
      'agent-models',
      'Agent model pin issues: ' + problems.join('; '),
      'Update agent frontmatter `model:` field to the explicit version.'
    );
  }
  if (upgradeCandidates.length > 0) {
    return warn(
      'agent-models',
      'Upgrade candidates on legacy aliases: ' + upgradeCandidates.join(', '),
      'Pin to explicit model strings (e.g. claude-sonnet-4-6) for stable behavior.'
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

// --- runner -----------------------------------------------------------------

function runDiagnostics(root) {
  var r = root || path.resolve(__dirname, '..', '..', '..', '..', '..');
  return [
    checkLicenseCleanup(r),
    checkHookChain(r),
    checkMcpAvailability(r),
    checkAgentModels(r),
    checkTestSuiteHealth(r),
    checkDisplayName(r),
    checkVersionParity(r),
    checkCriticalFiles(r),
  ];
}

module.exports = {
  runDiagnostics: runDiagnostics,
  checkLicenseCleanup: checkLicenseCleanup,
  checkHookChain: checkHookChain,
  checkMcpAvailability: checkMcpAvailability,
  checkAgentModels: checkAgentModels,
  checkTestSuiteHealth: checkTestSuiteHealth,
  checkDisplayName: checkDisplayName,
  checkVersionParity: checkVersionParity,
  checkCriticalFiles: checkCriticalFiles,
  EXPECTED_MCP_SERVERS: EXPECTED_MCP_SERVERS,
  EXPECTED_CONNECTOR_COUNT: EXPECTED_CONNECTOR_COUNT,
};
