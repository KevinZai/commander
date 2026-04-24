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
  // Agents — match expected pinning
  function agent(name, model) {
    writeFile(
      root,
      'commander/cowork-plugin/agents/' + name + '.md',
      ['---', 'name: ' + name, 'description: Test agent', 'model: ' + model, '---', '', '# Body'].join('\n')
    );
  }
  agent('architect', 'claude-opus-4-7');
  agent('security-auditor', 'claude-opus-4-7');
  agent('debugger', 'claude-opus-4-7');
  agent('product-manager', 'claude-opus-4-7');
  agent('designer', 'claude-sonnet-4-6');
  agent('researcher', 'claude-sonnet-4-6');
  agent('reviewer', 'claude-sonnet-4-6');
  agent('builder', 'claude-sonnet-4-6');
  agent('qa-engineer', 'claude-sonnet-4-6');
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

// --- 4. agent-models --------------------------------------------------------

test('checkAgentModels: ok when expected pinning matches', function () {
  var root = buildGoodFixture();
  var r = diag.checkAgentModels(root);
  assert.strictEqual(r.status, 'ok', r.message);
});

test('checkAgentModels: fail when architect not pinned to opus 4.7', function () {
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

test('checkAgentModels: warn for legacy aliases on optional agents', function () {
  var root = buildGoodFixture();
  writeFile(
    root,
    'commander/cowork-plugin/agents/builder.md',
    ['---', 'name: builder', 'description: Test', 'model: sonnet', '---'].join('\n')
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

test('runDiagnostics: returns 8 results with required shape', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root);
  assert.strictEqual(results.length, 8);
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    assert.ok(r.category, 'result needs category');
    assert.ok(['ok', 'warn', 'fail'].indexOf(r.status) >= 0, 'status must be ok|warn|fail, got ' + r.status);
    assert.ok(r.message, 'result needs message');
  }
});

test('runDiagnostics: all categories ok on canonical fixture', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root);
  var nonOk = results.filter(function (r) { return r.status !== 'ok'; });
  assert.strictEqual(nonOk.length, 0, 'expected all ok, got: ' + JSON.stringify(nonOk));
});

test('runDiagnostics: covers all 8 expected categories', function () {
  var root = buildGoodFixture();
  var results = diag.runDiagnostics(root);
  var categories = results.map(function (r) { return r.category; }).sort();
  var expected = [
    'agent-models',
    'critical-files',
    'display-name',
    'hook-chain',
    'license-cleanup',
    'mcp-availability',
    'test-suite',
    'version-parity',
  ];
  assert.deepStrictEqual(categories, expected);
});
