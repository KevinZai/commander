'use strict';

var childProcess = require('child_process');
var http = require('http');

var SERVICES = [
  { name: 'Fleet Commander', port: 4680, path: '/api/status', cli: 'fleet-commander', command: '/fleet' },
  { name: 'Agent HQ', port: 3005, path: '/api/costs', cli: null, command: '/cost' },
  { name: 'Synapse', port: 4682, path: '/api/health', cli: null, command: '/syn' },
  { name: 'CloudCLI', port: 4681, path: '/', cli: null, command: '/cloudcli' },
  { name: 'Paperclip', port: 3110, path: '/', cli: null, command: '/paperclip' },
  { name: 'OpenClaw', port: 18789, path: '/', cli: 'openclaw', command: '/openclaw' },
  { name: 'Ollama', port: 11434, path: '/', cli: 'ollama', command: null },
  { name: 'n8n', port: 5678, path: '/', cli: null, command: null },
];

var CLIS = [
  { name: 'ao', command: 'ao', skill: '/ao' },
  { name: 'claude', command: 'claude', skill: null },
  { name: 'fleet-commander', command: 'fleet-commander', skill: '/fleet' },
  { name: 'repomix', command: 'repomix', skill: null },
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

module.exports = { detectServices: detectServices, renderDetectionSummary: renderDetectionSummary, SERVICES: SERVICES, CLIS: CLIS };
