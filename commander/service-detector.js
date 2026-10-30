'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');

var SERVICES = [
  { name: 'Fleet Commander', port: 4680, path: '/api/status', cli: 'fleet-commander', command: '/fleet' },
  { name: 'Agent HQ', port: 3005, path: '/api/costs', cli: null, command: '/cost' },
  { name: 'Synapse', port: 4682, path: '/api/health', cli: null, command: '/syn' },
  { name: 'CloudCLI', port: 4681, path: '/', cli: null, command: '/cloudcli' },
  { name: 'Paperclip', port: 3110, path: '/', cli: null, command: '/paperclip' },
  { name: 'OpenClaw', port: 18789, path: '/', cli: 'openclaw', command: '/openclaw' },
  { name: 'ClaudeSwap', port: 8082, path: '/', cli: null, command: null },
  // NOTE: local-inference services are detected for status display only. Commander
  // never routes work to them — Anthropic models + the Codex CLI are the only
  // execution paths. Do not wire a detected local model into dispatch.
  { name: 'Ollama', port: 11434, path: '/', cli: 'ollama', command: null },
  { name: 'n8n', port: 5678, path: '/', cli: null, command: null },
];

var CLIS = [
  { name: 'ao', command: 'ao', skill: '/ao' },
  { name: 'claude', command: 'claude', skill: null },
  { name: 'fleet-commander', command: 'fleet-commander', skill: '/fleet' },
  { name: 'repomix', command: 'repomix', skill: null },
  { name: 'rtk', command: 'rtk', skill: null },
  { name: 'task-master', command: 'task-master', skill: '/tm' },
];

function probePort(port, path, timeoutMs) {
  return new Promise(function(resolve) {
    var req = http.get({ hostname: '127.0.0.1', port: port, path: path || '/', timeout: timeoutMs || 2000 }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        var json = null;
        try { json = JSON.parse(data); } catch(_) {}
        resolve({ up: true, statusCode: res.statusCode, data: json });
      });
    });
    req.on('error', function() { resolve({ up: false }); });
    req.on('timeout', function() { req.destroy(); resolve({ up: false }); });
  });
}

function checkCli(command) {
  try {
    childProcess.execFileSync('which', [command], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch(_) {
    return false;
  }
}

async function detectServices() {
  var results = [];

  // Probe all ports in parallel
  var probes = SERVICES.map(function(svc) {
    return probePort(svc.port, svc.path).then(function(result) {
      return {
        name: svc.name,
        port: svc.port,
        up: result.up,
        data: result.data,
        command: svc.command,
        cli: svc.cli ? checkCli(svc.cli) : null,
      };
    });
  });

  results = await Promise.all(probes);

  // Check CLIs
  var clis = CLIS.map(function(c) {
    return { name: c.name, available: checkCli(c.command), skill: c.skill };
  });

  return { services: results, clis: clis };
}

function renderDetectionSummary(detection) {
  var lines = [];
  var upCount = detection.services.filter(function(s) { return s.up; }).length;
  var cliCount = detection.clis.filter(function(c) { return c.available; }).length;

  lines.push('Detected: ' + upCount + ' services, ' + cliCount + ' CLIs\n');

  detection.services.forEach(function(svc) {
    var icon = svc.up ? '\x1b[32m\u25cf\x1b[0m' : '\x1b[31m\u25cb\x1b[0m';
    var cmd = svc.command ? ' \u2192 ' + svc.command : '';
    lines.push('  ' + icon + ' ' + svc.name.padEnd(18) + ':' + String(svc.port).padStart(6) + (svc.up ? ' UP' : ' DOWN') + cmd);
  });

  lines.push('');
  detection.clis.forEach(function(cli) {
    var icon = cli.available ? '\x1b[32m\u25cf\x1b[0m' : '\x1b[31m\u25cb\x1b[0m';
    var skill = cli.skill ? ' \u2192 ' + cli.skill : '';
    lines.push('  ' + icon + ' ' + cli.name.padEnd(18) + (cli.available ? ' installed' : ' not found') + skill);
  });

  return lines.join('\n');
}

// CC-197: MCP servers the user already configured, by name only (never env, headers or args, which can hold tokens).
// Claude Code keeps user-scope servers in <config dir>/.claude.json (mcpServers, and per-project entries under projects),
// project-scope ones in <project>/.mcp.json.
var KNOWN_MCP = [
  { name: 'Linear', match: /linear/i, command: '/ccc-linear' },
  { name: 'context-mode', match: /context-?mode/i, command: null },
];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function detectMcpServers(opts) {
  var o = opts || {};
  var configDir = o.configDir || process.env.CLAUDE_CONFIG_DIR || os.homedir();
  var cwd = o.cwd || process.cwd();
  var found = [];
  var add = function(names, source) {
    names.forEach(function(n) { if (!found.some(function(f) { return f.name === n; })) found.push({ name: n, source: source }); });
  };
  // Claude Code's precedence: local, then project, then user; a name keeps the scope that is in effect
  var user = readJson(path.join(configDir, '.claude.json'));
  var proj = user && user.projects && user.projects[cwd];
  if (proj && proj.mcpServers && typeof proj.mcpServers === 'object') add(Object.keys(proj.mcpServers), 'local');
  var shared = readJson(path.join(cwd, '.mcp.json'));
  if (shared && shared.mcpServers && typeof shared.mcpServers === 'object') add(Object.keys(shared.mcpServers), 'project');
  if (user && user.mcpServers && typeof user.mcpServers === 'object') add(Object.keys(user.mcpServers), 'user');
  return found.map(function(f) {
    var known = KNOWN_MCP.find(function(k) { return k.match.test(f.name); });
    return { name: f.name, source: f.source, known: known ? known.name : null, command: known ? known.command : null };
  });
}

// The "Infrastructure detected" block /ccc-init shows in its plan: only what is up, installed or configured.
// Read-only: it suggests commands, it never writes config.
function renderInitSection(detection) {
  var lines = ['## Infrastructure detected (read-only)'];
  var up = (detection.services || []).filter(function(s) { return s.up; });
  var clis = (detection.clis || []).filter(function(c) { return c.available; });
  var mcp = detection.mcp || [];
  up.forEach(function(s) { lines.push('- ' + s.name + ' on :' + s.port + (s.command ? ' → ' + s.command : '')); });
  clis.forEach(function(c) { lines.push('- ' + c.name + ' CLI' + (c.skill ? ' → ' + c.skill : '')); });
  mcp.forEach(function(m) { lines.push('- MCP ' + m.name + ' (' + m.source + ')' + (m.command ? ' → ' + m.command : '')); });
  if (lines.length === 1) lines.push('- nothing detected');
  return lines.join('\n');
}

// Port probes of the legacy SERVICES list are opt-in (opts.probe): only Claude Code and Codex are first-class, so a
// default run reads MCP names and checks CLIs on PATH and touches no port.
async function detectInfra(opts) {
  var o = opts || {};
  var d = o.probe ? await detectServices() : { services: [], clis: CLIS.map(function(c) { return { name: c.name, available: checkCli(c.command), skill: c.skill }; }) };
  d.mcp = detectMcpServers(o);
  return d;
}

module.exports = { detectServices: detectServices, detectInfra: detectInfra, detectMcpServers: detectMcpServers, renderDetectionSummary: renderDetectionSummary, renderInitSection: renderInitSection, SERVICES: SERVICES, CLIS: CLIS, KNOWN_MCP: KNOWN_MCP };

// node commander/service-detector.js [--json] [--probe]: what /ccc-init step 3 runs (--probe only when the user asks)
if (require.main === module) {
  detectInfra({ probe: process.argv.includes('--probe') }).then(function(d) {
    process.stdout.write((process.argv.includes('--json') ? JSON.stringify(d, null, 2) : renderInitSection(d)) + '\n');
  });
}
