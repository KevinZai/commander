'use strict';

// Infrastructure and services action handlers

module.exports = {

  async fleet_commander(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Fleet Commander') + '
');
      var cp = require('child_process');
      try {
        var fleetStatus = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4680/api/status'], { encoding: 'utf8' }));
        process.stdout.write('  ' + tui.boldText('Fleet Commander v' + (fleetStatus.version || '?'), tui.getTheme().primary) + '
');
        process.stdout.write('  Uptime: ' + (fleetStatus.uptime ? fleetStatus.uptime.formatted : '?') + '  |  Teams: ' + (fleetStatus.activeTeams || 0) + '  |  Connections: ' + (fleetStatus.sseConnections || 0) + '

');
        var teamsData = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4680/api/teams'], { encoding: 'utf8' }));
        var teams = teamsData.data || [];
        if (teams.length > 0) {
          process.stdout.write('  ' + tui.boldText('Active Teams:', tui.getTheme().text) + '
');
          teams.forEach(function(t) { process.stdout.write('    ' + tui.colorText(t.name || t.id, tui.getTheme().primary) + ' — ' + (t.agents || '?') + ' agents
'); });
        } else {
          process.stdout.write('  No active teams. Use /fleet to spawn one.
');
        }
      } catch(_e) {
        process.stdout.write('  Fleet Commander not responding on port 4680.
');
      }
      process.stdout.write('
  ' + tui.dimText('Use /fleet in your session for full fleet management.') + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'fleet_commander'); } catch(_) {}
      process.stdout.write('
  ❌ fleet_commander error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async cost_dashboard(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Cost Dashboard') + '
');
      var cp = require('child_process');
      try {
        var costs = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:3005/api/costs'], { encoding: 'utf8' }));
        process.stdout.write('  Today:     ' + tui.boldText('$' + (costs.today || 0).toFixed(4), tui.getTheme().primary) + '  (' + (costs.todayTokens || 0).toLocaleString() + ' tokens)
');
        process.stdout.write('  Yesterday: ' + tui.boldText('$' + (costs.yesterday || 0).toFixed(4), tui.getTheme().text) + '  (' + (costs.yesterdayTokens || 0).toLocaleString() + ' tokens)
');
        process.stdout.write('  Total:     ' + tui.boldText('$' + (costs.total || 0).toFixed(4), tui.getTheme().secondary) + '  (' + (costs.totalTokens || 0).toLocaleString() + ' tokens)

');
        if (costs.byAgent && costs.byAgent.length > 0) {
          process.stdout.write('  ' + tui.boldText('By Agent:', tui.getTheme().text) + '
');
          var maxCost = Math.max.apply(null, costs.byAgent.map(function(a) { return a.cost || 0; }));
          costs.byAgent.slice(0, 8).forEach(function(a) {
            var bar = tui.progressBar(Math.round((a.cost / (maxCost || 1)) * 100), 100);
            process.stdout.write('    ' + (a.agent || '?').padEnd(12) + ' $' + (a.cost || 0).toFixed(4) + '  ' + bar + '  ' + (a.messages || 0) + ' msgs
');
          });
        }
      } catch(_e) {
        process.stdout.write('  Agent HQ not responding on port 3005.
');
      }
      process.stdout.write('
  ' + tui.dimText('Use /cost in your session for detailed analysis.') + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'cost_dashboard'); } catch(_) {}
      process.stdout.write('
  ❌ cost_dashboard error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async synapse_observe(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Synapse Observability') + '
');
      var cp = require('child_process');
      try {
        var health = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4682/api/health'], { encoding: 'utf8' }));
        process.stdout.write('  ' + tui.boldText('Synapse', tui.getTheme().primary) + ' — ' + (health.ok ? tui.colorText('Online', tui.getTheme().success) : 'Offline') + '
');
        process.stdout.write('  Clients: ' + (health.clients || 0) + '  |  Agents: ' + (health.agents || 0) + '  |  Mode: ' + (health.mode || '?') + '
');
        if (health.db) {
          process.stdout.write('  Events: ' + (health.db.totalEvents || 0) + '  |  Sessions: ' + (health.db.totalSessions || 0) + '
');
        }
      } catch(_e) {
        process.stdout.write('  Synapse not responding on port 4682.
');
      }
      process.stdout.write('
  ' + tui.dimText('Use /syn in your session for detailed monitoring.') + '
');
      process.stdout.write('  ' + tui.dimText('Web UI: https://your-synapse.example.com') + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'synapse_observe'); } catch(_) {}
      process.stdout.write('
  ❌ synapse_observe error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async ao_spawn(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Composio AO') + '
');
      var cp = require('child_process');
      try {
        cp.execFileSync('which', ['ao'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('ao CLI found', tui.getTheme().success) + '

');
        process.stdout.write('  ' + tui.dimText('Use /ao in your session to spawn parallel agents.') + '
');
        process.stdout.write('  ' + tui.dimText('Config: agent-orchestrator.yaml') + '
');
      } catch(_e) {
        process.stdout.write('  ao CLI not found. Install: npm i -g @composio/ao
');
      }
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'ao_spawn'); } catch(_) {}
      process.stdout.write('
  ❌ ao_spawn error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async cloudcli_open(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('CloudCLI') + '
');
      var cp = require('child_process');
      try {
        cp.execFileSync('curl', ['-s', '--max-time', '2', 'http://localhost:4681/'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('CloudCLI running', tui.getTheme().success) + ' on port 4681
');
        process.stdout.write('  URL: ' + tui.boldText('https://your-cloudcli.example.com', tui.getTheme().primary) + '
');
        process.stdout.write('  ' + tui.dimText('Open on any device on your Tailnet for mobile access.') + '
');
      } catch(_e) {
        process.stdout.write('  CloudCLI not responding on port 4681.
');
      }
      process.stdout.write('
  ' + tui.dimText('Use /cloudcli in your session for session management.') + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'cloudcli_open'); } catch(_) {}
      process.stdout.write('
  ❌ cloudcli_open error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async paperclip_pickup(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Paperclip Tasks') + '
');
      var cp = require('child_process');
      try {
        cp.execFileSync('curl', ['-s', '--max-time', '2', 'http://localhost:3110/'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('Paperclip running', tui.getTheme().success) + ' on port 3110

');
      } catch(_e) {
        process.stdout.write('  Paperclip not responding on port 3110.
');
      }
      process.stdout.write('  ' + tui.dimText('Use /paperclip in your session to pick up tasks.') + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'paperclip_pickup'); } catch(_) {}
      process.stdout.write('
  ❌ paperclip_pickup error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'infrastructure' };
  },

  async back(engine, tui, state, choice) {
    return { next: 'main-menu' };
  },

  async detect_services(engine, tui, state, choice) {
    try {
      process.stdout.write('
' + tui.divider('Service Detection') + '

');
      var detector = require('../service-detector');
      var sp = tui.spinner('Scanning ports and CLIs...');
      sp.start();
      var detection = await detector.detectServices();
      sp.stop(true);
      process.stdout.write(detector.renderDetectionSummary(detection) + '
');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('
  Press Enter...');
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'detect_services'); } catch(_) {}
      process.stdout.write('
  ❌ detect_services error: ' + (_e.message || _e) + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'main-menu' };
  },

  async open_project(engine, tui, state, choice) {
    try {
      var pi = require('../project-importer');
      var stateModule = require('../state');
      var project = pi.scanProject(process.cwd());
      if (!project.hasClaudeMd && !project.hasClaudeDir) {
        process.stdout.write('
  No CLAUDE.md or .claude/ found in current directory.
');
        process.stdout.write('  ' + tui.dimText('cd into a project directory and restart, or specify a path.') + '
');
        if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
        var projDir = await engine.ask('
  Project path (or Enter to skip): ');
        if (projDir.trim()) { project = pi.scanProject(projDir.trim()); }
        else { return { next: 'main-menu' }; }
      }
      if (project.hasClaudeMd || project.hasClaudeDir) {
        stateModule.updateState({ activeProject: { dir: project.dir, name: project.name } });
        process.stdout.write('
' + tui.divider('Project Imported') + '
');
        process.stdout.write('  ' + tui.boldText(project.name, tui.getTheme().primary) + '
');
        if (project.summary && project.summary.length > 0) {
          project.summary.forEach(function(s) { process.stdout.write('  ' + tui.dimText('  v ' + s) + '
'); });
        }
        process.stdout.write('
  ' + tui.dimText('Dispatches will include this project CLAUDE.md context.') + '
');
        process.stdout.write('  ' + tui.dimText('CC Commander will NOT modify your .claude/ directory.') + '
');
        process.stdout.write(tui.celebrate('Project loaded!'));
        try { require('../integrations/linear').pulse('claude_md_loaded', project.name).catch(function(){}); } catch(_e2) {}
        await engine.pause(1500);
      }
    } catch(_e) {
      var _eid = ''; try { _eid = require('../error-logger').logError(_e, 'open_project'); } catch(_) {}
      process.stdout.write('
  ❌ open_project error: ' + (_e.message || 'Unknown error') + '
');
      if (_eid) process.stdout.write('  Error ID: ' + _eid + '
');
    }
    return { next: 'main-menu' };
  },

};
