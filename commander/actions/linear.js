'use strict';

// Linear integration action handlers

module.exports = {

  async show_linear(engine, tui, state, choice) {
    try {
      var linearMod = require('../integrations/linear');
      var conn = await linearMod.checkConnection();
      var prog = await linearMod.getProgress();
      process.stdout.write('\n' + tui.divider('Linear Connection') + '\n');
      process.stdout.write('  Connected: ' + (conn.connected ? 'Yes (' + (conn.user||'') + ')' : 'No') + '\n');
      process.stdout.write('  ' + prog.total + ' issues: ' + prog.done + ' done, ' + prog.inProgress + ' active, ' + prog.backlog + ' backlog\n');
      process.stdout.write('  ' + tui.progressBar(prog.done, prog.total) + '\n');
    } catch(_e) {
      try { require('../error-logger').log(_e, 'show_linear'); } catch(_) {}
      process.stdout.write('\n  Linear not connected. Set LINEAR_API_KEY_PERSONAL.\n');
    }
    if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
    await engine.ask('\n  Press Enter...');
    return { next: 'settings' };
  },

  async linear_setup(engine, tui, state, choice) {
    try {
      var setupLinear = require('../integrations/linear');
      var setupConn = await setupLinear.checkConnection();
      if (!setupConn.connected) {
        process.stdout.write('\n  Linear not connected. Set LINEAR_API_KEY_PERSONAL env var.\n  Get one at: linear.app/settings/api\n');
        return { next: 'settings' };
      }
      process.stdout.write('\n  Connected as: ' + tui.boldText(setupConn.user, tui.getTheme().primary) + '\n\n');
      var teams = await setupLinear.listTeams();
      if (teams.length === 0) { process.stdout.write('  No teams found.\n'); return { next: 'settings' }; }
      var teamItems = teams.map(function(team) { return { label: team.key + ' - ' + team.name }; });
      var teamIdx = await tui.select(teamItems, 'Select your team:');
      if (teamIdx < 0) return { next: 'settings' };
      var selectedTeam = teams[teamIdx];
      var projects = await setupLinear.getTeamProjects(selectedTeam.id);
      if (projects.length === 0) { process.stdout.write('  No projects in team ' + selectedTeam.key + '.\n'); return { next: 'settings' }; }
      var projItems = projects.map(function(p) { return { label: p.name, description: p.state || '' }; });
      var projIdx = await tui.select(projItems, 'Select your project:');
      if (projIdx < 0) return { next: 'settings' };
      setupLinear.saveConfig(selectedTeam.key, projects[projIdx].name);
      process.stdout.write(tui.celebrate('Linear: ' + selectedTeam.key + ' / ' + projects[projIdx].name));
      await engine.pause(1000);
    } catch(_e) {
      try { require('../error-logger').log(_e, 'linear_setup'); } catch(_) {}
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
    }
    return { next: 'settings' };
  },

  async show_linear_board(engine, tui, state, choice) {
    try {
      var boardLinear = require('../integrations/linear');
      var boardConn = await boardLinear.checkConnection();
      if (!boardConn.connected) { process.stdout.write('\n  Linear not connected. Run Settings > Linear Setup first.\n'); return { next: 'main-menu' }; }
      var grouped = await boardLinear.getIssuesByStatus();
      var prog2 = await boardLinear.getProgress();
      process.stdout.write('\n' + tui.divider('Linear Board') + '\n');
      process.stdout.write('  ' + tui.progressBar(prog2.done, prog2.total) + '  ' + prog2.done + '/' + prog2.total + ' done\n\n');
      var sections = [
        { label: 'In Progress', items: grouped.started, color: tui.getTheme().primary },
        { label: 'Todo', items: grouped.unstarted, color: tui.getTheme().secondary },
        { label: 'Backlog', items: grouped.backlog, color: tui.getTheme().dim },
      ];
      sections.forEach(function(s) {
        if (s.items.length === 0) return;
        process.stdout.write('  ' + tui.boldText(s.label + ' (' + s.items.length + ')', s.color) + '\n');
        s.items.slice(0, 8).forEach(function(i) {
          process.stdout.write('    ' + tui.dimText(i.identifier) + ' ' + i.title.slice(0, 60) + '\n');
        });
        process.stdout.write('\n');
      });
      if (grouped.completed.length > 0) {
        process.stdout.write('  ' + tui.dimText('Done: ' + grouped.completed.length + ' issues') + '\n\n');
      }
    } catch(_e) {
      try { require('../error-logger').log(_e, 'show_linear_board'); } catch(_) {}
      process.stdout.write('\n  Error loading board: ' + (_e.message || _e) + '\n');
    }
    return { next: 'linear-board' };
  },

  async linear_create_issue(engine, tui, state, choice) {
    try {
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      var issueTitle = await engine.ask('  Issue title: ');
      if (!issueTitle.trim()) return { next: 'linear-board' };
      var issueDesc = await engine.ask('  Description (optional): ');
      var createLinear = require('../integrations/linear');
      var created = await createLinear.quickCreateIssue(issueTitle.trim(), issueDesc.trim());
      process.stdout.write(tui.celebrate(created.identifier + ' created!'));
    } catch(_e) {
      try { require('../error-logger').log(_e, 'linear_create_issue'); } catch(_) {}
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
    }
    return { next: 'linear-board' };
  },

  async linear_pick_issue(engine, tui, state, choice) {
    try {
      var pickLinear = require('../integrations/linear');
      var pickGrouped = await pickLinear.getIssuesByStatus();
      var pickable = pickGrouped.unstarted.concat(pickGrouped.backlog);
      if (pickable.length === 0) { process.stdout.write('\n  No available issues to pick.\n'); return { next: 'linear-board' }; }
      var pickItems = pickable.slice(0, 15).map(function(i) { return { label: i.identifier + ' ' + i.title.slice(0, 50) }; });
      pickItems.push({ label: 'Back' });
      var pickIdx = await tui.select(pickItems, 'Pick an issue:');
      if (pickIdx < 0 || pickIdx >= pickable.length) return { next: 'linear-board' };
      var picked = pickable[pickIdx];
      process.stdout.write('\n  Assigning ' + picked.identifier + '...\n');
      await pickLinear.assignIssueToMe(picked.id);
      var startedStateId = await pickLinear.findStateId('started');
      if (startedStateId) await pickLinear.updateIssue(picked.id, { stateId: startedStateId });
      await engine.executeBuildFromIssue(picked);
    } catch(_e) {
      try { require('../error-logger').log(_e, 'linear_pick_issue'); } catch(_) {}
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
    }
    return { next: 'main-menu' };
  },

};
