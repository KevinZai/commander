'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');

var diag = require('../cowork-plugin/skills/ccc-doctor/lib/diagnostics');

// --- fixture helpers --------------------------------------------------------

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-doctor-diag-'));
}

function writeFile(root, rel, content) {
  var full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

// Build a minimal "good" fixture root that should pass every check.
function buildGoodFixture() {
  var root = mkTmp();
  // hooks.json + hook scripts (ESM)
  writeFile(
    root,
    'commander/cowork-plugin/hooks/hooks.json',
    JSON.stringify({
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js', timeout: 1000 },
            ],
          },
        ],
        PreToolUse: [
          {
            hooks: [
              { type: 'command', command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/cost-tracker.js', timeout: 1000 },
            ],
          },
        ],
      },
    })
  );
  writeFile(root, 'commander/cowork-plugin/hooks/session-start.js', "import {x} from 'node:fs';\n// session-start\n");
  writeFile(root, 'commander/cowork-plugin/hooks/cost-tracker.js', "import {y} from 'node:fs';\n// cost-tracker\n");
  // .mcp.json with the canonical 2 servers
  writeFile(
    root,
    'commander/cowork-plugin/.mcp.json',
    JSON.stringify({
      mcpServers: {
        context7: { type: 'stdio', command: 'npx', args: [] },
        'sequential-thinking': { command: 'npx', args: [] },
      },
    })
  );
  // CONNECTORS.md with a 16-row MCP catalog
  var rows = [];
  for (var i = 1; i <= 16; i++) rows.push('| Row' + i + ' | Cat | reason | No | install |');
  writeFile(
    root,
    'commander/cowork-plugin/CONNECTORS.md',
    [
      '## 🔌 Recommended MCP Servers',
      '',
      '| MCP | Category | Why it matters | Affiliate? | Install |',
      '|-----|----------|----------------|------------|---------|',
      rows.join('\n'),
    ].join('\n')
  );
  writeFile(
    root,
    'commander/contract.json',
    JSON.stringify({
      plugin_skills: 1,
      specialist_agents: 9,
      lifecycle_hooks: 2,
      bundled_mcp_servers: 2,
    })
  );
  writeFile(
    root,
    'CLAUDE.md',
    'Aggregator Ecosystem\n18 vendor submodules in `vendor/`.\n'
  );
  for (var v = 1; v <= 18; v++) {
    writeFile(root, 'vendor/vendor-' + v + '/README.md', '# vendor\n');
  }
  writeFile(
    root,
    'home/.claude/settings.json',
    JSON.stringify({
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
      effortLevel: 'high',
    })
  );
  writeFile(
    root,
    'commander/cowork-plugin/skills/ccc-doctor/SKILL.md',
    ['---', 'name: ccc-doctor', 'description: Test skill', 'model: sonnet', '---', '', '# Body'].join('\n')
  );
  // Agents — match expected pinning
  function agent(name, model) {
    writeFile(
      root,
      'commander/cowork-plugin/agents/' + name + '.md',
      ['---', 'name: ' + name, 'description: Test agent', 'model: ' + model, '---', '', '# Body'].join('\n')
    );
  }
  agent('architect', 'fable');
  agent('security-auditor', 'claude-fable-5-1');
  agent('debugger', 'opus');
  agent('product-manager', 'opus');
  agent('designer', 'claude-opus-5-5');
  agent('researcher', 'opus');
  agent('reviewer', 'opus');
  agent('builder', 'opus');
  agent('technical-writer', 'sonnet');
  // Audit scripts (empty stubs are enough — we only check existence)
  writeFile(root, 'scripts/audit-frontmatter.js', '// stub\n');
  writeFile(root, 'scripts/audit-counts.js', '// stub\n');
  writeFile(root, 'scripts/check-version-parity.js', '// stub\n');
  // Manifests with matching versions + displayName
  writeFile(
    root,
    'package.json',
    JSON.stringify({ name: 'cc-commander', version: '4.0.0-beta.11' })
  );
  writeFile(
    root,
    'commander/cowork-plugin/.claude-plugin/plugin.json',
    JSON.stringify({ name: 'commander', displayName: 'Commander', version: '4.0.0-beta.11' })
  );
  writeFile(
    root,
    '.claude-plugin/marketplace.json',
    JSON.stringify({
      name: 'commander-hub',
      plugins: [{ name: 'commander', displayName: 'Commander', version: '4.0.0-beta.11' }],
      version: '4.0.0-beta.11',
    })
  );
  // Critical files
  writeFile(root, 'CHANGELOG.md', '# Changelog\n');
  writeFile(root, 'README.md', '# README\n');
  writeFile(root, 'LICENSE', 'MIT\n');
  writeFile(root, 'commander/core/registry.yaml', 'version: 1\n');
  return root;
}

function diagnosticsOptions(root) {
  return { homeDir: path.join(root, 'home') };
}

// --- 0. claude settings -----------------------------------------------------

test('checkClaudeTeamsFlag: ok when Agent Teams env flag is set', function () {
  var root = buildGoodFixture();
  var r = diag.checkClaudeTeamsFlag(root, diagnosticsOptions(root));
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkClaudeTeamsFlag: warn when Agent Teams env flag is missing', function () {
  var root = buildGoodFixture();
  writeFile(root, 'home/.claude/settings.json', JSON.stringify({ env: {} }));
  var r = diag.checkClaudeTeamsFlag(root, diagnosticsOptions(root));
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'));
});

test('checkEffortDefault: reports configured effortLevel', function () {
  var root = buildGoodFixture();
  var r = diag.checkEffortDefault(root, diagnosticsOptions(root));
  assert.strictEqual(r.status, 'ok', r.message);
  assert.ok(r.message.includes('effortLevel=high'));
});

test('checkEffortDefault: notes inherited default when absent', function () {
  var root = buildGoodFixture();
  writeFile(root, 'home/.claude/settings.json', JSON.stringify({ env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' } }));
  var r = diag.checkEffortDefault(root, diagnosticsOptions(root));
  assert.strictEqual(r.status, 'ok');
  assert.ok(r.message.includes('inherits harness default'));
});

// --- 1. license-cleanup -----------------------------------------------------

test('checkLicenseCleanup: ok when no license residue', function () {
  var root = buildGoodFixture();
  var r = diag.checkLicenseCleanup(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkLicenseCleanup: fail when license.json reference present', function () {
  var root = buildGoodFixture();
  writeFile(root, 'commander/cowork-plugin/hooks/bad.js', "import x from 'y';\n// reads license.json\n");
  var r = diag.checkLicenseCleanup(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('bad.js'));
  assert.ok(r.remediation);
});

test('checkLicenseCleanup: fail when isPro() pattern present', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/hooks/gated.js',
    "import x from 'y';\nif (isPro()) { /* ... */ }\n"
  );
  var r = diag.checkLicenseCleanup(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('gated.js'));
});

// --- 2. hook-chain ----------------------------------------------------------

test('checkHookChain: ok on canonical fixture', function () {
  var root = buildGoodFixture();
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkHookChain: fail when referenced hook missing on disk', function () {
  var root = buildGoodFixture();
  fs.unlinkSync(path.join(root, 'commander/cowork-plugin/hooks/cost-tracker.js'));
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('missing'));
});

test('checkHookChain: fail when hook uses legacy require()', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/hooks/cost-tracker.js',
    "const fs = require('fs');\n"
  );
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(/legacy require|no ESM import/.test(r.message));
});

test('checkHookChain: fail when unregistered .js file present', function () {
  var root = buildGoodFixture();
  writeFile(root, 'commander/cowork-plugin/hooks/orphan.js', "import x from 'y';\n");
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('orphan.js'));
});

// CC-2099: SessionStart handlers the orchestrator imports are registered too.

function addOrchestrator(root, handlerFiles) {
  var manifestPath = path.join(root, 'commander/cowork-plugin/hooks/hooks.json');
  var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.hooks.SessionStart[0].hooks.push({
    type: 'command',
    command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/orchestrator/session-start-orchestrator.js"',
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  var list = handlerFiles.map(function (f) { return "  { name: 'x', file: '../" + f + "' },"; }).join('\n');
  writeFile(
    root,
    'commander/cowork-plugin/hooks/orchestrator/session-start-orchestrator.js',
    "import { join } from 'node:path';\n// { file: '../commented-out.js' }\nconst handlers = [\n" + list + "\n];\n"
  );
}

test('checkHookChain: a handler the orchestrator imports counts as registered', function () {
  var root = buildGoodFixture();
  addOrchestrator(root, ['nudge.js', '_archive/legacy-start.js']);
  writeFile(root, 'commander/cowork-plugin/hooks/nudge.js', "import { a } from 'node:fs';\n");
  writeFile(root, 'commander/cowork-plugin/hooks/_archive/legacy-start.js', "import { a } from 'node:fs';\n");
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'ok', r.message);
  var report = diag.hookChainReport(path.join(root, 'commander/cowork-plugin/hooks'));
  assert.ok(report.registered.includes('nudge.js'));
  assert.ok(report.registered.includes('_archive/legacy-start.js'));
});

test('checkHookChain: fail when an orchestrator handler is missing on disk', function () {
  var root = buildGoodFixture();
  addOrchestrator(root, ['gone.js']);
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('missing: gone.js'), r.message);
});

test('checkHookChain: orchestrator handlers do not count when the orchestrator is not registered', function () {
  var root = buildGoodFixture();
  writeFile(root, 'commander/cowork-plugin/hooks/orchestrator/session-start-orchestrator.js', "import x from 'y';\nconst h = [{ file: '../nudge.js' }];\n");
  writeFile(root, 'commander/cowork-plugin/hooks/nudge.js', "import { a } from 'node:fs';\n");
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('unregistered: nudge.js'), r.message);
});

test('checkHookChain: an unregistered _archive handler fails unless allowlisted', function () {
  var root = buildGoodFixture();
  writeFile(root, 'commander/cowork-plugin/hooks/_archive/stray.js', "import x from 'y';\n");
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('_archive/stray.js'), r.message);
  writeFile(root, 'commander/cowork-plugin/hooks/_archive/stray.js', '');
  fs.renameSync(
    path.join(root, 'commander/cowork-plugin/hooks/_archive/stray.js'),
    path.join(root, 'commander/cowork-plugin/hooks/_archive/permission-denied.js')
  );
  assert.strictEqual(diag.checkHookChain(root).status, 'ok');
});

test('every shipped hook file is registered or explicitly allowlisted', function () {
  var hooksDir = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
  var report = diag.hookChainReport(hooksDir);
  assert.strictEqual(report.loadable, true);
  assert.deepStrictEqual(report.unregistered, []);
  assert.deepStrictEqual(report.missing, []);
  assert.ok(report.registered.includes('fable-armed-nudge.js'));
  assert.ok(report.registered.includes('voice-injector.js'));
  diag.DORMANT_HOOK_ALLOWLIST.forEach(function (rel) {
    if (rel.endsWith('.js')) assert.ok(fs.existsSync(path.join(hooksDir, rel)), 'allowlisted ' + rel + ' exists');
  });
});

test('ccc doctor on a fresh copy of the shipped hooks: hook chain ok (0 critical)', function () {
  var root = buildGoodFixture();
  var hooksDir = path.join(root, 'commander/cowork-plugin/hooks');
  fs.rmSync(hooksDir, { recursive: true, force: true });
  fs.cpSync(path.join(__dirname, '..', 'cowork-plugin', 'hooks'), hooksDir, { recursive: true });
  var r = diag.checkHookChain(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

// --- 3. mcp-availability ----------------------------------------------------

test('checkMcpAvailability: ok with 2 bundled + 16 connectors', function () {
  var root = buildGoodFixture();
  var r = diag.checkMcpAvailability(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkMcpAvailability: warn when extra MCP server bundled', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/.mcp.json',
    JSON.stringify({
      mcpServers: {
        context7: {},
        'sequential-thinking': {},
        tavily: {},
      },
    })
  );
  var r = diag.checkMcpAvailability(root);
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('drift'));
});

test('checkMcpAvailability: warn when connector count drifts', function () {
  var root = buildGoodFixture();
  // Truncate to 5 rows
  var rows = [];
  for (var i = 1; i <= 5; i++) rows.push('| Row' + i + ' | Cat | reason | No | install |');
  writeFile(
    root,
    'commander/cowork-plugin/CONNECTORS.md',
    [
      '## 🔌 Recommended MCP Servers',
      '',
      '| MCP | Category | Why it matters | Affiliate? | Install |',
      '|-----|----------|----------------|------------|---------|',
      rows.join('\n'),
    ].join('\n')
  );
  var r = diag.checkMcpAvailability(root);
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('connector count drift'));
});

// --- 3b. full-stack integrity ----------------------------------------------

test('checkContractIntegrity: ok when contract counts match filesystem', function () {
  var root = buildGoodFixture();
  var r = diag.checkContractIntegrity(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkContractIntegrity: fail when plugin skill count drifts', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/contract.json',
    JSON.stringify({
      plugin_skills: 2,
      specialist_agents: 9,
      lifecycle_hooks: 2,
      bundled_mcp_servers: 2,
    })
  );
  var r = diag.checkContractIntegrity(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('plugin_skills'));
});

test('checkVendorSubmodules: ok when vendor count matches CLAUDE.md claim', function () {
  var root = buildGoodFixture();
  var r = diag.checkVendorSubmodules(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkVendorSubmodules: warn when vendor count drifts', function () {
  var root = buildGoodFixture();
  writeFile(root, 'CLAUDE.md', 'Aggregator Ecosystem\n19 vendor submodules in `vendor/`.\n');
  var r = diag.checkVendorSubmodules(root);
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('Vendor count drift'));
});

test('checkBundledMcpServers: ok when .mcp.json count matches contract', function () {
  var root = buildGoodFixture();
  var r = diag.checkBundledMcpServers(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkBundledMcpServers: warn when .mcp.json count drifts from contract', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/.mcp.json',
    JSON.stringify({ mcpServers: { context7: {} } })
  );
  var r = diag.checkBundledMcpServers(root);
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('contract expects 2'));
});

// --- 4. agent-models --------------------------------------------------------

test('checkAgentModels: ok when expected pinning matches', function () {
  var root = buildGoodFixture();
  var r = diag.checkAgentModels(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

// Regression guard: for ~2 releases the fixture and the expectation drifted together
// (agents were promoted to claude-fable-5 in v6.0, but this check still demanded an
// Opus pin), so every fixture test stayed green while /ccc-doctor failed on the real,
// healthy repo. A synthetic fixture can never again mask that — assert against the
// ACTUAL repo, which is the thing users' doctor runs actually inspect.
test('checkAgentModels: ok against the REAL repo (not a fixture)', function () {
  var repoRoot = path.resolve(__dirname, '..', '..');
  var r = diag.checkAgentModels(repoRoot);
  assert.strictEqual(
    r.status,
    'ok',
    'ccc-doctor must pass on this repo as shipped. Got: ' + r.message
  );
});

test('checkAgentModels: fail when architect is on the wrong tier (opus instead of fable)', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/agents/architect.md',
    ['---', 'name: architect', 'description: Test', 'model: opus', '---'].join('\n')
  );
  var r = diag.checkAgentModels(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('architect'));
});

test('checkAgentModels: warn for a superseded pinned model id', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/agents/builder.md',
    ['---', 'name: builder', 'description: Test', 'model: claude-opus-5', '---'].join('\n')
  );
  var r = diag.checkAgentModels(root);
  assert.strictEqual(r.status, 'warn');
  assert.ok(r.message.includes('builder'));
});

// --- 5. test-suite health ---------------------------------------------------

test('checkTestSuiteHealth: ok when all 3 audit scripts present', function () {
  var root = buildGoodFixture();
  var r = diag.checkTestSuiteHealth(root);
  assert.strictEqual(r.status, 'ok');
});

test('checkTestSuiteHealth: fail when an audit script missing', function () {
  var root = buildGoodFixture();
  fs.unlinkSync(path.join(root, 'scripts/audit-counts.js'));
  var r = diag.checkTestSuiteHealth(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('audit-counts.js'));
});

// --- 6. displayName ---------------------------------------------------------

test('checkDisplayName: ok on canonical fixture', function () {
  var root = buildGoodFixture();
  var r = diag.checkDisplayName(root);
  assert.strictEqual(r.status, 'ok');
});

test('checkDisplayName: fail when plugin.json displayName missing', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/.claude-plugin/plugin.json',
    JSON.stringify({ name: 'commander', version: '4.0.0-beta.11' })
  );
  var r = diag.checkDisplayName(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('plugin.json.displayName'));
});

test('checkDisplayName: fail when marketplace displayName wrong', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    '.claude-plugin/marketplace.json',
    JSON.stringify({
      name: 'commander-hub',
      plugins: [{ name: 'commander', displayName: 'cc-commander', version: '4.0.0-beta.11' }],
      version: '4.0.0-beta.11',
    })
  );
  var r = diag.checkDisplayName(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('marketplace.json'));
});

// --- 7. version parity ------------------------------------------------------

test('checkVersionParity: ok when versions match', function () {
  var root = buildGoodFixture();
  var r = diag.checkVersionParity(root);
  assert.strictEqual(r.status, 'ok');
});

test('checkVersionParity: fail when plugin.json drifts', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/.claude-plugin/plugin.json',
    JSON.stringify({ name: 'commander', displayName: 'Commander', version: '4.0.0-beta.10' })
  );
  var r = diag.checkVersionParity(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('Drift'));
  assert.ok(r.remediation.includes('bump-version'));
});

// --- 8. critical files ------------------------------------------------------

test('checkCriticalFiles: ok when all present', function () {
  var root = buildGoodFixture();
  var r = diag.checkCriticalFiles(root);
  assert.strictEqual(r.status, 'ok');
});

test('checkCriticalFiles: fail when LICENSE missing', function () {
  var root = buildGoodFixture();
  fs.unlinkSync(path.join(root, 'LICENSE'));
  var r = diag.checkCriticalFiles(root);
  assert.strictEqual(r.status, 'fail');
  assert.ok(r.message.includes('LICENSE'));
});

// --- runDiagnostics ---------------------------------------------------------

test('runDiagnostics: returns 13 results with required shape', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root, diagnosticsOptions(root));
  assert.strictEqual(results.length, 13);
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    assert.ok(r.category, 'result needs category');
    assert.ok(['ok', 'warn', 'fail'].indexOf(r.status) >= 0, 'status must be ok|warn|fail, got ' + r.status);
    assert.ok(r.message, 'result needs message');
  }
});

test('runDiagnostics: all categories ok on canonical fixture', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root, diagnosticsOptions(root));
  var nonOk = results.filter(function (r) { return r.status !== 'ok'; });
  assert.strictEqual(nonOk.length, 0, 'expected all ok, got: ' + JSON.stringify(nonOk));
});

test('runDiagnostics: covers all 13 expected categories', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root, diagnosticsOptions(root));
  var categories = results.map(function (r) { return r.category; }).sort();
  var expected = [
    'agent-models',
    'bundled-mcp-servers',
    'claude-teams-flag',
    'contract-integrity',
    'critical-files',
    'display-name',
    'effort-default',
    'hook-chain',
    'license-cleanup',
    'mcp-availability',
    'test-suite',
    'vendor-submodules',
    'version-parity',
  ];
  assert.deepStrictEqual(categories, expected);
});
