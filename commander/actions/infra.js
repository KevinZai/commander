'use strict';

// Infrastructure and services action handlers

module.exports = {

  async fleet_commander(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Fleet Commander') + '\n');
      var cp = require('child_process');
      try {
        var fleetStatus = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4680/api/status'], { encoding: 'utf8' }));
        process.stdout.write('  ' + tui.boldText('Fleet Commander v' + (fleetStatus.version || '?'), tui.getTheme().primary) + '\n');
        process.stdout.write('  Uptime: ' + (fleetStatus.uptime ? fleetStatus.uptime.formatted : '?') + '  |  Teams: ' + (fleetStatus.activeTeams || 0) + '  |  Connections: ' + (fleetStatus.sseConnections || 0) + '\n\n');
        var teamsData = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4680/api/teams'], { encoding: 'utf8' }));
        var teams = teamsData.data || [];
        if (teams.length > 0) {
          process.stdout.write('  ' + tui.boldText('Active Teams:', tui.getTheme().text) + '\n');
          teams.forEach(function(t) { process.stdout.write('    ' + tui.colorText(t.name || t.id, tui.getTheme().primary) + ' — ' + (t.agents || '?') + ' agents\n'); });
        } else {
          process.stdout.write('  No active teams. Use /fleet to spawn one.\n');
        }
      } catch(_e) {
        process.stdout.write('  Fleet Commander not responding on port 4680.\n');
      }
      process.stdout.write('\n  ' + tui.dimText('Use /fleet in your session for full fleet management.') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },

  async cost_dashboard(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Cost Dashboard') + '\n');
      var cp = require('child_process');
      try {
        var costs = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:3005/api/costs'], { encoding: 'utf8' }));
        process.stdout.write('  Today:     ' + tui.boldText('$' + (costs.today || 0).toFixed(4), tui.getTheme().primary) + '  (' + (costs.todayTokens || 0).toLocaleString() + ' tokens)\n');
        process.stdout.write('  Yesterday: ' + tui.boldText('$' + (costs.yesterday || 0).toFixed(4), tui.getTheme().text) + '  (' + (costs.yesterdayTokens || 0).toLocaleString() + ' tokens)\n');
        process.stdout.write('  Total:     ' + tui.boldText('$' + (costs.total || 0).toFixed(4), tui.getTheme().secondary) + '  (' + (costs.totalTokens || 0).toLocaleString() + ' tokens)\n\n');
        if (costs.byAgent && costs.byAgent.length > 0) {
          process.stdout.write('  ' + tui.boldText('By Agent:', tui.getTheme().text) + '\n');
          var maxCost = Math.max.apply(null, costs.byAgent.map(function(a) { return a.cost || 0; }));
          costs.byAgent.slice(0, 8).forEach(function(a) {
            var bar = tui.progressBar(Math.round((a.cost / (maxCost || 1)) * 100), 100);
            process.stdout.write('    ' + (a.agent || '?').padEnd(12) + ' $' + (a.cost || 0).toFixed(4) + '  ' + bar + '  ' + (a.messages || 0) + ' msgs\n');
          });
        }
      } catch(_e) {
        process.stdout.write('  Agent HQ not responding on port 3005.\n');
      }
      process.stdout.write('\n  ' + tui.dimText('Use /cost in your session for detailed analysis.') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },

  async synapse_observe(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Synapse Observability') + '\n');
      var cp = require('child_process');
      try {
        var health = JSON.parse(cp.execFileSync('curl', ['-s', '--max-time', '3', 'http://localhost:4682/api/health'], { encoding: 'utf8' }));
        process.stdout.write('  ' + tui.boldText('Synapse', tui.getTheme().primary) + ' — ' + (health.ok ? tui.colorText('Online', tui.getTheme().success) : 'Offline') + '\n');
        process.stdout.write('  Clients: ' + (health.clients || 0) + '  |  Agents: ' + (health.agents || 0) + '  |  Mode: ' + (health.mode || '?') + '\n');
        if (health.db) {
          process.stdout.write('  Events: ' + (health.db.totalEvents || 0) + '  |  Sessions: ' + (health.db.totalSessions || 0) + '\n');
        }
      } catch(_e) {
        process.stdout.write('  Synapse not responding on port 4682.\n');
      }
      process.stdout.write('\n  ' + tui.dimText('Use /syn in your session for detailed monitoring.') + '\n');
      process.stdout.write('  ' + tui.dimText('Web UI: https://your-synapse.example.com') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },

  async ao_spawn(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Composio AO') + '\n');
      var cp = require('child_process');
      try {
        cp.execFileSync('which', ['ao'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('ao CLI found', tui.getTheme().success) + '\n\n');
        process.stdout.write('  ' + tui.dimText('Use /ao in your session to spawn parallel agents.') + '\n');
        process.stdout.write('  ' + tui.dimText('Config: agent-orchestrator.yaml') + '\n');
      } catch(_e) {
        process.stdout.write('  ao CLI not found. Install: npm i -g @composio/ao\n');
      }
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },

  async cloudcli_open(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('CloudCLI') + '\n');
      var cp = require('child_process');
      try {
        cp.execFileSync('curl', ['-s', '--max-time', '2', 'http://localhost:4681/'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('CloudCLI running', tui.getTheme().success) + ' on port 4681\n');
        process.stdout.write('  URL: ' + tui.boldText('https://your-cloudcli.example.com', tui.getTheme().primary) + '\n');
        process.stdout.write('  ' + tui.dimText('Open on any device on your Tailnet for mobile access.') + '\n');
      } catch(_e) {
        process.stdout.write('  CloudCLI not responding on port 4681.\n');
      }
      process.stdout.write('\n  ' + tui.dimText('Use /cloudcli in your session for session management.') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },

  async paperclip_pickup(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Paperclip Tasks') + '\n');
      var cp = require('child_process');
      try {
        cp.execFileSync('curl', ['-s', '--max-time', '2', 'http://localhost:3110/'], { encoding: 'utf8' });
        process.stdout.write('  ' + tui.colorText('Paperclip running', tui.getTheme().success) + ' on port 3110\n\n');
      } catch(_e) {
        process.stdout.write('  Paperclip not responding on port 3110.\n');
      }
      process.stdout.write('  ' + tui.dimText('Use /paperclip in your session to pick up tasks.') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) { process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n'); }
    return { next: 'infrastructure' };
  },


  async taskmaster_status(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('TaskMaster') + '\n');
      var cp = require('child_process');
      try {
        var version = cp.execFileSync('task-master', ['--version'], { encoding: 'utf8', stdio: 'pipe' }).trim();
        process.stdout.write('  ' + tui.colorText('TaskMaster ' + version, tui.getTheme().success) + '\n\n');
      } catch(_e) {
        process.stdout.write('  TaskMaster CLI not found. Install: npm i -g task-master-ai\n');
      }
      process.stdout.write('  ' + tui.dimText('Use /tm in your session for PRD parsing and task management.') + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
      try { require('../error-logger').logError(_e, 'taskmaster_status'); } catch(_) {}
    }
    return { next: 'infrastructure' };
  },

  async back(_engine, _tui, _state, _choice) {
    return { next: 'main-menu' };
  },

  async detect_services(engine, tui, _state, _choice) {
    try {
      process.stdout.write('\n' + tui.divider('Service Detection') + '\n\n');
      var detector = require('../service-detector');
      var sp = tui.spinner('Scanning ports and CLIs...');
      sp.start();
      var detection = await detector.detectServices();
      sp.stop(true);
      process.stdout.write(detector.renderDetectionSummary(detection) + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
      try { require('../error-logger').log(_e, 'detect_services'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async open_project(engine, tui, _state, _choice) {
    try {
      var pi = require('../project-importer');
      var stateModule = require('../state');
      var project = pi.scanProject(process.cwd());
      if (!project.hasClaudeMd && !project.hasClaudeDir) {
        process.stdout.write('\n  No CLAUDE.md or .claude/ found in current directory.\n');
        process.stdout.write('  ' + tui.dimText('cd into a project directory and restart, or specify a path.') + '\n');
        if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
        var projDir = await engine.ask('\n  Project path (or Enter to skip): ');
        if (projDir.trim()) { project = pi.scanProject(projDir.trim()); }
        else { return { next: 'main-menu' }; }
      }
      if (project.hasClaudeMd || project.hasClaudeDir) {
        stateModule.updateState({ activeProject: { dir: project.dir, name: project.name } });
        process.stdout.write('\n' + tui.divider('Project Imported') + '\n');
        process.stdout.write('  ' + tui.boldText(project.name, tui.getTheme().primary) + '\n');
        if (project.summary && project.summary.length > 0) {
          project.summary.forEach(function(s) { process.stdout.write('  ' + tui.dimText('  v ' + s) + '\n'); });
        }
        process.stdout.write('\n  ' + tui.dimText('Dispatches will include this project CLAUDE.md context.') + '\n');
        process.stdout.write('  ' + tui.dimText('CC Commander will NOT modify your .claude/ directory.') + '\n');
        process.stdout.write(tui.celebrate('Project loaded!'));
        try { require('../integrations/linear').pulse('claude_md_loaded', project.name).catch(function(){}); } catch(_e2) {}
        await engine.pause(1500);
      }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'open_project'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

};
