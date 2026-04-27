'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var CONTRACT_PATH = path.join(ROOT, 'commander', 'contract.json');
var CHECK_SCRIPT = path.join(ROOT, 'scripts', 'check-product-contract.js');

var REQUIRED_FIELDS = {
  version: 'string',
  plugin_skills: 'number',
  specialist_agents: 'number',
  lifecycle_hooks: 'number',
  hook_handlers: 'number',
  bundled_mcp_servers: 'number',
  opt_in_mcp_servers: 'number',
  ecosystem_skills: 'number',
  ccc_domains: 'number',
  package_name: 'string',
  plugin_name: 'string',
  plugin_displayName: 'string',
  marketplace_name: 'string',
  repo: 'string',
  homepage: 'string',
  command_prefix: 'string',
  license: 'string',
  free_forever: 'boolean',
  hosted_mcp_status: 'string',
  claude_code_compat: 'string',
  codex_cli_compat: 'string',
  codex_desktop_compat: 'string',
  cursor_windsurf_compat: 'string',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(root, rel, content) {
  var filePath = path.join(root, rel);
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function countFilesNamed(dir, filename) {
  var count = 0;
  function walk(current) {
    fs.readdirSync(current, { withFileTypes: true }).forEach(function(entry) {
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

function countHookHandlers(hooksConfig) {
  var total = 0;
  Object.keys(hooksConfig.hooks || {}).forEach(function(eventName) {
    (hooksConfig.hooks[eventName] || []).forEach(function(group) {
      total += Array.isArray(group.hooks) ? group.hooks.length : 0;
    });
  });
  return total;
}

function spawnCheck(args, cwd) {
  return cp.spawnSync(process.execPath, [CHECK_SCRIPT].concat(args), {
    cwd: cwd || ROOT,
    encoding: 'utf8',
  });
}

function makeFixture(extraFiles) {
  var contract = readJson(CONTRACT_PATH);
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'commander-contract-'));

  writeFile(root, 'commander/contract.json', JSON.stringify(contract, null, 2) + '\n');
  writeFile(root, 'README.md', [
    '# CC Commander',
    '',
    'CC Commander v' + contract.version + ' ships ' + contract.plugin_skills + ' plugin skills, ' + contract.specialist_agents + ' specialist agents, ' + contract.lifecycle_hooks + ' lifecycle hooks (' + contract.hook_handlers + ' handlers), ' + contract.bundled_mcp_servers + ' bundled MCPs +' + contract.opt_in_mcp_servers + ' opt-in via /ccc-connect, and ' + contract.ecosystem_skills + '+ skills across ' + contract.ccc_domains + ' CCC domains.',
    'All local plugin functionality is free forever.',
    'Hosted MCP is scaffolded-not-deployed.',
    '',
  ].join('\n'));
  writeFile(root, 'commander/cowork-plugin/.claude-plugin/plugin.json', JSON.stringify({
    name: contract.plugin_name,
    displayName: contract.plugin_displayName,
    version: contract.version,
    description: contract.plugin_skills + ' plugin skills, ' + contract.specialist_agents + ' specialist agents, ' + contract.lifecycle_hooks + ' lifecycle hooks (' + contract.hook_handlers + ' handlers), ' + contract.bundled_mcp_servers + ' bundled MCPs +' + contract.opt_in_mcp_servers + ' opt-in.',
    homepage: contract.homepage,
    repository: 'https://github.com/' + contract.repo,
    license: contract.license,
  }, null, 2) + '\n');
  writeFile(root, '.claude-plugin/marketplace.json', JSON.stringify({
    name: contract.marketplace_name,
    plugins: [
      {
        name: contract.plugin_name,
        displayName: contract.plugin_displayName,
        version: contract.version,
        license: contract.license,
        description: contract.plugin_skills + ' plugin skills and ' + contract.specialist_agents + ' specialist agents.',
      },
    ],
  }, null, 2) + '\n');
  writeFile(root, 'apps/mcp-server-cloud/package.json', JSON.stringify({
    name: 'cc-commander-mcp-cloud',
    version: contract.version,
    description: contract.ecosystem_skills + '+ skills across ' + contract.ccc_domains + ' CCC domains.',
  }, null, 2) + '\n');

  Object.keys(extraFiles || {}).forEach(function(rel) {
    writeFile(root, rel, extraFiles[rel]);
  });

  return root;
}

test('contract.json has all required fields', function() {
  var contract = readJson(CONTRACT_PATH);
  Object.keys(REQUIRED_FIELDS).forEach(function(field) {
    assert.strictEqual(typeof contract[field], REQUIRED_FIELDS[field], field + ' must be a ' + REQUIRED_FIELDS[field]);
  });
});

test('check-product-contract.js exits 0 on a clean fixture', function() {
  var root = makeFixture();
  var result = spawnCheck(['--root', root, '--check']);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS: no product contract drift found/);
});

test('check-product-contract.js exits 1 when a fixture has drift', function() {
  var root = makeFixture({
    'README.md': 'CC Commander v4.0.0-beta.11 ships 50 plugin skills and stays free forever.\n',
  });
  var result = spawnCheck(['--root', root, '--check']);
  assert.strictEqual(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /field: plugin_skills/);
  assert.match(result.stdout, /expected: 55/);
  assert.match(result.stdout, /actual: 50/);
});

test('--patch fixes simple count and version mismatches', function() {
  var contract = readJson(CONTRACT_PATH);
  var root = makeFixture({
    'README.md': 'CC Commander v1.2.3 ships 50 plugin skills, 15 specialist agents, 6 lifecycle hooks (12 handlers), 9 pre-configured MCP servers +5 opt-in, and 453+ skills across 10 CCC domains. Free forever.\n',
  });

  var patch = spawnCheck(['--root', root, '--patch']);
  assert.strictEqual(patch.status, 0, patch.stdout + patch.stderr);

  var readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, new RegExp('v' + contract.version.replace(/\./g, '\\.')));
  assert.match(readme, /55 plugin skills/);
  assert.match(readme, /17 specialist agents/);
  assert.match(readme, /8 lifecycle hooks \(14 handlers\)/);
  assert.match(readme, /2 pre-configured MCP servers \+16 opt-in/);
  assert.match(readme, /459\+ skills across 11 CCC domains/);

  var check = spawnCheck(['--root', root, '--check']);
  assert.strictEqual(check.status, 0, check.stdout + check.stderr);
});

test('--patch leaves non-trivial mismatches alone', function() {
  var root = makeFixture({
    'README.md': 'Upgrade to Pro ($19/mo) for 5 specialized agents.\n',
  });
  var result = spawnCheck(['--root', root, '--patch']);
  assert.strictEqual(result.status, 1, result.stdout + result.stderr);
  var readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /Upgrade to Pro \(\$19\/mo\)/);
  assert.match(result.stdout, /field: free_forever/);
});

test('contract.json values match the actual filesystem', function() {
  var contract = readJson(CONTRACT_PATH);
  var pkg = readJson(path.join(ROOT, 'package.json'));
  var plugin = readJson(path.join(ROOT, 'commander/cowork-plugin/.claude-plugin/plugin.json'));
  var marketplace = readJson(path.join(ROOT, '.claude-plugin/marketplace.json'));
  var hooks = readJson(path.join(ROOT, 'commander/cowork-plugin/hooks/hooks.json'));
  var mcp = readJson(path.join(ROOT, 'commander/cowork-plugin/.mcp.json'));

  assert.strictEqual(contract.version, pkg.version);
  assert.strictEqual(contract.package_name, pkg.name);
  assert.strictEqual(contract.license, pkg.license);
  assert.strictEqual(contract.plugin_name, plugin.name);
  assert.strictEqual(contract.plugin_displayName, plugin.displayName);
  assert.strictEqual(contract.marketplace_name, marketplace.name);
  assert.strictEqual(contract.plugin_skills, countFilesNamed(path.join(ROOT, 'commander/cowork-plugin/skills'), 'SKILL.md'));
  assert.strictEqual(contract.specialist_agents, fs.readdirSync(path.join(ROOT, 'commander/cowork-plugin/agents')).filter(function(file) { return file.endsWith('.md'); }).length);
  assert.strictEqual(contract.lifecycle_hooks, Object.keys(hooks.hooks).length);
  assert.strictEqual(contract.hook_handlers, countHookHandlers(hooks));
  assert.strictEqual(contract.bundled_mcp_servers, Object.keys(mcp.mcpServers).length);
  assert.strictEqual(contract.ecosystem_skills, countFilesNamed(path.join(ROOT, 'skills'), 'SKILL.md'));
});
