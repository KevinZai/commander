'use strict';

var readline = require('readline');
var path = require('path');
var adventure = require('./adventure');
var tui = require('./tui');
var state = require('./state');
var BRAND = require('./branding');

var cockpit = require('./cockpit');

var dispatcher = null;
function getDispatcher() { if (!dispatcher) dispatcher = require('./dispatcher'); return dispatcher; }

var kitStats = null;
function getStats() {
  if (!kitStats) { try { kitStats = require('../lib/kit-stats'); } catch (_e) { kitStats = { getStats: function() { return {}; }, getStreak: function() { return { current: 0 }; }, getAchievements: function() { return []; } }; } }
  return kitStats;
}

var skillBrowser = null;
function getSkillBrowser() { if (!skillBrowser) skillBrowser = require('./skill-browser'); return skillBrowser; }

class KitCommander {
  constructor() { this.rl = null; this.running = false; }

  async start() {
    process.on('SIGINT', function() {
      process.stdout.write('\n\n  Interrupted. Saving state...\n');
      process.stdout.write('  ' + tui.dimText(BRAND.footer) + '\n');
      process.exit(0);
    });

    this.running = true;
    var currentState = state.loadState();

    // Load saved theme
    if (currentState.theme) tui.setTheme(currentState.theme);

    if (currentState.firstRun) { await this.onboard(); }

    // Auto-detect project in current directory
    if (!currentState.activeProject) {
      var fs = require('fs');
      var detectedName = null;
      var cwd = process.cwd();
      if (fs.existsSync(require('path').join(cwd, 'CLAUDE.md'))) {
        detectedName = require('path').basename(cwd);
      } else if (fs.existsSync(require('path').join(cwd, '.claude', 'CLAUDE.md'))) {
        detectedName = require('path').basename(cwd);
      }
      if (detectedName) {
        process.stdout.write('\n  ' + tui.boldText('\u{1F4C2} Project detected: ' + detectedName, tui.getTheme().primary) + '\n');
        var loadItems = [
          { label: 'Yes, load ' + detectedName, description: 'Use this project\'s CLAUDE.md for context' },
          { label: 'No, skip', description: 'Start without a project' },
        ];
        var loadIdx = await tui.select(loadItems, 'Load this project?');
        if (loadIdx === 0) {
          var pi = require('./project-importer');
          var project = pi.scanProject(cwd);
          state.updateState({ activeProject: { dir: project.dir, name: project.name || detectedName } });
          process.stdout.write('  ' + tui.dimText('Project loaded. Context will be included in dispatches.') + '\n\n');
          try { require('./integrations/linear').pulse('claude_md_loaded', detectedName).catch(function(){}); } catch(_e) {}
        }
      }
    }

    await this.runAdventure('main-menu');
  }

  async onboard() {
    await tui.wipeTransition();
    process.stdout.write(tui.renderLogoResponsive('CC CMD'));
      process.stdout.write("  " + tui.gradient(BRAND.tagline, tui.getTheme().logo.gradient) + "\n");
      process.stdout.write("\n");
    process.stdout.write('\n  ' + tui.boldText(BRAND.tagline, tui.getTheme().primary) + '\n');
    process.stdout.write('  ' + tui.dimText(BRAND.scope) + '\n\n');
    process.stdout.write('  ' + BRAND.welcomeNew + '\n\n');

    // Theme picker
    process.stdout.write('  ' + tui.boldText('Pick a theme:', tui.getTheme().text) + '\n\n');
    var themeNames = tui.getThemeNames();
    var themeItems = themeNames.map(function(n) {
      var t = tui.THEMES[n];
      return { label: t.name, description: tui.gradient('████████', [t.primary, t.secondary]) };
    });
    var themeIdx = await tui.select(themeItems, 'Choose your vibe:', {
      onChange: function(i) { if (i >= 0 && i < themeNames.length) tui.setTheme(themeNames[i]); }
    });
    if (themeIdx >= 0) {
      tui.setTheme(themeNames[themeIdx]);
      state.updateState({ theme: themeNames[themeIdx] });
    }

    await tui.wipeTransition();
    process.stdout.write(tui.renderLogoResponsive('CC CMD'));
      process.stdout.write("  " + tui.gradient(BRAND.tagline, tui.getTheme().logo.gradient) + "\n");
      process.stdout.write("\n");

    // Name
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    var name = await this.ask('\n  What\'s your name? ');
    state.updateUser({ name: name.trim() || 'Friend' });

    // Level
    var levelItems = [
      { label: "I'm brand new to coding and AI tools" },
      { label: "I've used some AI tools but I'm not a developer" },
      { label: "I'm a developer looking for a guided workflow" },
      { label: "I'm a power user — skip the tutorial" },
    ];
    this.rl.close(); this.rl = null;
    process.stdout.write('\n  Nice to meet you, ' + (name.trim() || 'Friend') + '!\n\n');
    var levelIdx = await tui.select(levelItems, 'What\'s your experience level?');
    var levels = ['guided', 'guided', 'assisted', 'power'];
    state.updateUser({ level: levels[levelIdx >= 0 ? levelIdx : 0] });
    state.updateState({ firstRun: false });

    process.stdout.write('\n' + tui.celebrate('Setup complete!') + '\n');
    process.stdout.write('  ' + tui.dimText(BRAND.planModeNote) + '\n');
    await this.pause(1500);
  }

  async runAdventure(adventureId) {
    while (this.running) {
      var adv = adventure.loadAdventure(adventureId);
      if (!adv) { process.stdout.write('\n  Adventure "' + adventureId + '" not found.\n'); adventureId = 'main-menu'; continue; }

      var currentState = state.loadState();
      var stats = getStats().getStats ? getStats().getStats() : {};
      var prepared = adventure.prepareAdventure(adv, currentState, stats);

      if (prepared.action) { await this.executeAction(prepared.action, currentState); }

      var activeChoices = prepared.afterAction ? prepared.afterAction.choices : prepared.choices;
      var activePrompt = prepared.afterAction ? prepared.afterAction.prompt : prepared.prompt;

      process.stdout.write('\x1b[2J\x1b[H'); // fast clear

      // Build cockpit data from state
      var skillCount = 0; try { skillCount = getSkillBrowser().listSkills().length; } catch(_e) {}
      var vendorCount = 0; try { var fs = require('fs'); vendorCount = fs.readdirSync(require('path').join(__dirname, '..', 'vendor')).length; } catch(_e) {}
      var activeLinear = currentState.activeSession ? (currentState.activeSession.linearIssueIdentifier || null) : null;
      var cockpitData = {
        model: process.env.ANTHROPIC_MODEL || 'Opus 1M',
        cost: stats.totalCost || 0,
        inputTokens: 0,
        outputTokens: 0,
        duration: '0s',
        contextPct: 0,
        ratePct: 0,
        linearTicket: activeLinear,
        linearTitle: '',
        skillCount: skillCount,
        vendorCount: vendorCount,
        activeSkill: null,
        thinking: false,
        toolActive: false,
      };

      // Active project for title bar
      var projName = (currentState.activeProject && currentState.activeProject.name) || null;

      // Main menu: full logo + cockpit panel
      if (adventureId === 'main-menu') {
        process.stdout.write(tui.renderLogoResponsive('CCC'));
        process.stdout.write(cockpit.renderBanner(null, projName));
        process.stdout.write(cockpit.renderCockpitStatus(cockpitData));
      } else {
        // Sub-menus: compact header with project name + one-line footer
        process.stdout.write(cockpit.renderCompactHeader(null, projName));
        process.stdout.write(cockpit.renderCockpitFooter(cockpitData) + '\n');
      }

      // Welcome dashboard for main menu
      if (adventureId === 'main-menu') {
        var recMod; try { recMod = require('./recommendations'); } catch(_e) {}
        var recs = recMod ? recMod.getRecommendations(currentState, stats) : [];
        var lastSessions = state.listSessions(1);
        var welcomeData = {
          streak: (stats.streak && stats.streak.current) || 0,
          sessions: (currentState.user && currentState.user.sessionsCompleted) || 0,
          achievements: (stats.achievements && stats.achievements.length) || 0,
          cost: stats.totalCost || 0,
          lastTask: lastSessions.length > 0 ? lastSessions[0].task : null,
          recommendation: recs.length > 0 ? recs[0].text : null,
        };
        process.stdout.write(tui.renderWelcomeDash(welcomeData));
      }
      if (prepared.subtitle) process.stdout.write('  ' + tui.dimText(prepared.subtitle) + '\n');
      if (prepared.detail) process.stdout.write('  ' + tui.dimText(prepared.detail) + '\n');
      process.stdout.write(tui.divider(prepared.title) + '\n\n');

      // Arrow-key menu
      var menuItems = (activeChoices || []).map(function(ch) {
        return { label: ch.label, description: ch.description || '', key: ch.key, action: ch.action, next: ch.next };
      });
      var idx = await tui.select(menuItems, activePrompt || 'Choose:');

      if (idx < 0 || idx >= menuItems.length) { continue; }
      var choice = activeChoices[idx];

      if (choice.action === 'quit') { await this.quit(); return; }

      if (choice.action) {
        var result = await this.executeAction(choice.action, currentState, choice);
        if (result && result.next) { adventureId = result.next; continue; }
        if (adv.subAdventures && adv.subAdventures[choice.next || choice.key]) {
          var sub = adv.subAdventures[choice.next || choice.key];
          if (sub.action === 'freeform_build') {
            process.stdout.write('\n  ' + tui.boldText(sub.prompt, tui.getTheme().text) + '\n');
            if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            var desc = await this.ask('  > ');
            await this.executeBuild((sub.context || '') + desc);
            adventureId = 'main-menu'; continue;
          }
        }
        adventureId = 'main-menu'; continue;
      }

      if (choice.next) {
        if (adv.subAdventures && adv.subAdventures[choice.next]) {
          var sub2 = adv.subAdventures[choice.next];
          process.stdout.write('\n  ' + tui.boldText(sub2.prompt, tui.getTheme().text) + '\n');
          if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          var desc2 = await this.ask('  > ');
          if (sub2.action === 'freeform_build') {
            await this.executeBuild((sub2.context || '') + desc2);
            adventureId = 'main-menu'; continue;
          }
        }
        adventureId = choice.next; continue;
      }
    }
  }

  async executeAction(actionName, currentState, choice) {
    if (!choice) choice = {};
    var t = tui.getTheme();
    switch (actionName) {
      case 'freeform_build':
      case 'freeform_dispatch': {
        process.stdout.write('\n  ' + tui.boldText('Tell me what you want to build:', t.text) + '\n');
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        var desc = await this.ask('  > ');
        await this.executeBuild(desc);
        return { next: 'main-menu' };
      }
      case 'dispatch': {
        var dispatchTask = (choice && choice.description) || 'autonomous task';
        await this.executeBuild(dispatchTask);
        return { next: 'main-menu' };
      }
      case 'freeform_prompt': {
        process.stdout.write('\x0a  ' + tui.boldText('Type anything — a command, a question, or what you want to build:', tui.getTheme().text) + '\x0a');
        process.stdout.write('  ' + tui.dimText('Examples: /ccc:xray  |  build a landing page  |  /plan  |  fix the auth bug') + '\x0a\x0a');
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        var freeInput = await this.ask('  > ');
        if (!freeInput.trim()) return { next: 'main-menu' };
        await this.executeBuild(freeInput.trim());
        return { next: 'main-menu' };
      }
      case 'resume_session': {
        var active = state.getActiveSession();
        if (!active) { process.stdout.write('\n  No active session found.\n'); await this.pause(1500); return { next: 'main-menu' }; }
        await this.resumeSession(active);
        return { next: 'main-menu' };
      }
      case 'show_session_summary': {
        var active2 = state.getActiveSession();
        if (active2) { process.stdout.write('\n' + this.renderSession(active2) + '\n'); }
        else { process.stdout.write('\n  No active session.\n'); }
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return null;
      }
      case 'resume_with_summary': {
        var act = state.getActiveSession();
        if (act) { state.completeSession(act.id, 'restarted'); await this.executeBuild('Continue: ' + act.task); }
        return { next: 'main-menu' };
      }
      case 'show_stats': {
        var s = getStats().getStats ? getStats().getStats() : {};
        var streak = getStats().getStreak ? getStats().getStreak() : { current: 0 };
        var ach = getStats().getAchievements ? getStats().getAchievements() : [];
        var dashData = { sessions: s.totalSessions || currentState.user.sessionsCompleted || 0, streak: streak.current || 0, longestStreak: streak.longest || 0, achievements: ach.length, cost: s.totalCost || 0, level: state.getUserLevel(currentState), dailyCosts: [], dailySessions: [] }; if (s.dailyLog) { var dates = Object.keys(s.dailyLog).sort().slice(-7); dashData.dailyCosts = dates.map(function(d) { return s.dailyLog[d].cost || 0; }); dashData.dailySessions = dates.map(function(d) { return s.dailyLog[d].sessions || 0; }); } process.stdout.write(tui.renderDashboard(dashData));
        return null;
      }
      case 'show_achievements': {
        var achs = getStats().getAchievements ? getStats().getAchievements() : [];
        if (achs.length === 0) { process.stdout.write('\n  No achievements yet. Keep building!\n'); }
        else { process.stdout.write('\n' + tui.divider('Achievements') + '\n'); achs.forEach(function(a) { process.stdout.write('  ' + tui.colorText('  v ', t.success) + (typeof a === 'string' ? a : a.name || String(a)) + '\n'); }); }
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return { next: 'check-stats' };
      }
      case 'show_history': case 'show_recent_sessions': {
        var sessions = state.listSessions(5);
        if (sessions.length === 0) { process.stdout.write('\n  No sessions yet.\n'); }
        else { process.stdout.write('\n' + tui.divider('Recent Sessions') + '\n\n'); sessions.forEach(function(s) { process.stdout.write(this.renderSession(s) + '\n\n'); }.bind(this)); }
        if (actionName === 'show_recent_sessions') return null;
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return { next: 'check-stats' };
      }
      case 'browse_skills': return await this.browseSkills(false);
      case 'browse_ccc_domains': return { next: 'ccc-domains' };
      case 'show_cheatsheet': return await this.showCheatsheet();
      case 'recommend_skill': return await this.recommendSkill(currentState);
      case 'pick_session_to_resume': return await this.pickSessionToResume();
      case 'pick_session_details': return await this.pickSessionDetails();
      case 'night_build': {
        return await this.nightBuild();
      }
      case 'yolo_loop': {
        return await this.yoloLoop();
      }
      case 'night_explain': {
        var nightMsg = [
          '',
          tui.divider('What is Night Mode?'),
          '',
          '  Night Mode asks 10+ detailed questions to build a comprehensive spec.',
          '  Then it dispatches an autonomous build with:',
          '    - Max effort (Opus with deep reasoning)',
          '    - High budget ($10 ceiling)',
          '    - 100 max turns',
          '    - Full 10-step orchestration (planning, review, QA, knowledge)',
          '    - Self-testing loop',
          '',
          '  Designed for overnight runs. Start it before bed. Wake up to shipped code.',
        ].join('\x0a');
        process.stdout.write(nightMsg + '\x0a');
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\x0a  Press Enter...');
        return { next: 'night-build' };
      }
      case 'open_project': {
        var pi = require('./project-importer');
        var project = pi.scanProject(process.cwd());
        if (!project.hasClaudeMd && !project.hasClaudeDir) {
          process.stdout.write('\n  No CLAUDE.md or .claude/ found in current directory.\n');
          process.stdout.write('  ' + tui.dimText('cd into a project directory and restart, or specify a path.') + '\n');
          if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          var projDir = await this.ask('\n  Project path (or Enter to skip): ');
          if (projDir.trim()) { project = pi.scanProject(projDir.trim()); }
          else { return { next: 'main-menu' }; }
        }
        if (project.hasClaudeMd || project.hasClaudeDir) {
          state.updateState({ activeProject: { dir: project.dir, name: project.name } });
          process.stdout.write('\n' + tui.divider('Project Imported') + '\n');
          process.stdout.write('  ' + tui.boldText(project.name, tui.getTheme().primary) + '\n');
          if (project.summary.length > 0) {
            project.summary.forEach(function(s) { process.stdout.write('  ' + tui.dimText('  v ' + s) + '\n'); });
          }
          process.stdout.write('\n  ' + tui.dimText('Dispatches will include this project CLAUDE.md context.') + '\n');
          process.stdout.write('  ' + tui.dimText('CC Commander will NOT modify your .claude/ directory.') + '\n');
          process.stdout.write(tui.celebrate('Project loaded!'));
          try { require('./integrations/linear').pulse('claude_md_loaded', project.name).catch(function(){}); } catch(_e) {}
          await this.pause(1500);
        }
        return { next: 'main-menu' };
      }
      case 'show_all_mega': {
        process.stdout.write('\n' + tui.divider('All 11 CCC Domains') + '\n\n');
        var sb = getSkillBrowser();
        var allSkills = sb.listSkills();
        var megas = allSkills.filter(function(s) { return s.isMega; });
        if (megas.length === 0) { process.stdout.write('  No CCC domains found.\n'); }
        megas.forEach(function(m) {
          var subCount = 0;
          try { var fs2 = require('fs'); var entries = fs2.readdirSync(require('path').dirname(m.path), {withFileTypes:true}); subCount = entries.filter(function(e){return e.isDirectory();}).length; } catch(_e) {}
          process.stdout.write('  ' + tui.boldText(m.name, tui.getTheme().primary) + ' (' + (subCount || '?') + ' sub-skills)\n');
          process.stdout.write('  ' + tui.dimText(m.description || '') + '\n\n');
        });
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return { next: 'ccc-domains' };
      }
      case 'show_mega_detail': {
        process.stdout.write('\n  ' + tui.boldText('Pick a CCC domain and describe your need.', tui.getTheme().text) + '\n');
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        var megaTask = await this.ask('  > ');
        if (megaTask.trim()) await this.executeBuild(megaTask);
        return { next: 'ccc-domains' };
      }
      case 'show_linear': {
        try {
          var linearMod = require('./integrations/linear');
          var conn = await linearMod.checkConnection();
          var prog = await linearMod.getProgress();
          process.stdout.write('\n' + tui.divider('Linear Connection') + '\n');
          process.stdout.write('  Connected: ' + (conn.connected ? 'Yes (' + (conn.user||'') + ')' : 'No') + '\n');
          process.stdout.write('  ' + prog.total + ' issues: ' + prog.done + ' done, ' + prog.inProgress + ' active, ' + prog.backlog + ' backlog\n');
          process.stdout.write('  ' + tui.progressBar(prog.done, prog.total) + '\n');
        } catch(_e) { process.stdout.write('\n  Linear not connected. Set LINEAR_API_KEY_PERSONAL.\n'); }
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return { next: 'settings' };
      }
      case 'linear_setup': {
        try {
          var setupLinear = require('./integrations/linear');
          var setupConn = await setupLinear.checkConnection();
          if (!setupConn.connected) { process.stdout.write('\n  Linear not connected. Set LINEAR_API_KEY_PERSONAL env var.\n  Get one at: linear.app/settings/api\n'); break; }
          process.stdout.write('\n  Connected as: ' + tui.boldText(setupConn.user, tui.getTheme().primary) + '\n\n');
          var teams = await setupLinear.listTeams();
          if (teams.length === 0) { process.stdout.write('  No teams found.\n'); break; }
          var teamItems = teams.map(function(team) { return { label: team.key + ' - ' + team.name }; });
          var teamIdx = await tui.select(teamItems, 'Select your team:');
          if (teamIdx < 0) break;
          var selectedTeam = teams[teamIdx];
          var projects = await setupLinear.getTeamProjects(selectedTeam.id);
          if (projects.length === 0) { process.stdout.write('  No projects in team ' + selectedTeam.key + '.\n'); break; }
          var projItems = projects.map(function(p) { return { label: p.name, description: p.state || '' }; });
          var projIdx = await tui.select(projItems, 'Select your project:');
          if (projIdx < 0) break;
          setupLinear.saveConfig(selectedTeam.key, projects[projIdx].name);
          process.stdout.write(tui.celebrate('Linear: ' + selectedTeam.key + ' / ' + projects[projIdx].name));
          await this.pause(1000);
        } catch(_e) { process.stdout.write('\n  Error: ' + _e.message + '\n'); }
        return { next: 'settings' };
      }
      case 'show_linear_board': {
        try {
          var boardLinear = require('./integrations/linear');
          var boardConn = await boardLinear.checkConnection();
          if (!boardConn.connected) { process.stdout.write('\n  Linear not connected. Run Settings > Linear Setup first.\n'); break; }
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
        } catch(_e) { process.stdout.write('\n  Error loading board: ' + _e.message + '\n'); }
        return null;
      }
      case 'linear_create_issue': {
        try {
          if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          var issueTitle = await this.ask('  Issue title: ');
          if (!issueTitle.trim()) return { next: 'linear-board' };
          var issueDesc = await this.ask('  Description (optional): ');
          var createLinear = require('./integrations/linear');
          var created = await createLinear.quickCreateIssue(issueTitle.trim(), issueDesc.trim());
          process.stdout.write(tui.celebrate(created.identifier + ' created!'));
        } catch(_e) { process.stdout.write('\n  Error: ' + _e.message + '\n'); }
        return { next: 'linear-board' };
      }
      case 'linear_pick_issue': {
        try {
          var pickLinear = require('./integrations/linear');
          var pickGrouped = await pickLinear.getIssuesByStatus();
          var pickable = pickGrouped.unstarted.concat(pickGrouped.backlog);
          if (pickable.length === 0) { process.stdout.write('\n  No available issues to pick.\n'); return { next: 'linear-board' }; }
          var pickItems = pickable.slice(0, 15).map(function(i) { return { label: i.identifier + ' ' + i.title.slice(0, 50) }; });
          pickItems.push({ label: 'Back' });
          var pickIdx = await tui.select(pickItems, 'Pick an issue:');
          if (pickIdx < 0 || pickIdx >= pickable.length) return null;
          var picked = pickable[pickIdx];
          process.stdout.write('\n  Assigning ' + picked.identifier + '...\n');
          await pickLinear.assignIssueToMe(picked.id);
          var startedStateId = await pickLinear.findStateId('started');
          if (startedStateId) await pickLinear.updateIssue(picked.id, { stateId: startedStateId });
          await this.executeBuildFromIssue(picked);
        } catch(_e) {
          process.stdout.write('\n  Error: ' + _e.message + '\n');
        }
        return { next: 'main-menu' };
      }
      case 'settings_name': {
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        var newName = await this.ask('  New name: ');
        if (newName.trim()) { state.updateUser({ name: newName.trim() }); process.stdout.write(tui.celebrate('Name updated!')); }
        return { next: 'settings' };
      }
      case 'settings_level': {
        var lvlIdx = await tui.select([{label:'Guided'},{label:'Assisted'},{label:'Power'}], 'Experience level:');
        var lvls = ['guided','assisted','power'];
        if (lvlIdx >= 0) { state.updateUser({ level: lvls[lvlIdx] }); process.stdout.write(tui.celebrate('Level: ' + lvls[lvlIdx].toUpperCase())); }
        return { next: 'settings' };
      }
      case 'settings_cost': {
        var costIdx = await tui.select([{label:'$2 (conservative)'},{label:'$5 (standard)'},{label:'$10 (aggressive)'},{label:'No limit'}], 'Max cost per dispatch:');
        var costs = [2, 5, 10, 999];
        if (costIdx >= 0) { state.updateState({ maxBudget: costs[costIdx] }); process.stdout.write(tui.celebrate('Budget: $' + costs[costIdx])); }
        return { next: 'settings' };
      }
      case 'settings_animations': {
        var current = process.env.KC_NO_ANIMATION === '1' ? 'OFF' : 'ON';
        process.stdout.write('\n  Animations are currently ' + current + '\n');
        process.stdout.write('  Set KC_NO_ANIMATION=1 in your shell to disable.\n');
        if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await this.ask('\n  Press Enter...');
        return { next: 'settings' };
      }
      case "settings_reset": {
        var confirmIdx = await tui.select([{label:"Yes, reset everything"},{label:"No, keep my data"}], "Are you sure?");
        if (confirmIdx === 0) { var defState = { version: 1, user: { name: null, level: "guided", sessionsCompleted: 0 }, activeSession: null, profiles: {}, firstRun: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; state.saveState(defState); process.stdout.write(tui.celebrate("State reset!")); return { next: "main-menu" }; }
        return { next: "settings" };
      }
      case 'change_theme': return await this.changeTheme();
      default: process.stdout.write('\n  Unknown action: ' + actionName + '\n'); await this.pause(1000); return null;
    }
  }

  async executeBuild(task) {
    var currentState = state.loadState();
    var userLevel = state.getUserLevel(currentState);
    var spec = await this.runSpecFlow(task, userLevel);
    var fullTask = spec.enrichedTask;
    var session = state.createSession({ task: fullTask, project: null });

    // Sync to Linear — capture issue ID
    try {
      var linearStart = require("./integrations/linear");
      var linearIssue = await linearStart.syncSession(session, "started");
      if (linearIssue && linearIssue.id) {
        state.updateSession(session.id, { linearIssueId: linearIssue.id, linearIssueIdentifier: linearIssue.identifier || null });
      }
      linearStart.pulse("session_start", fullTask.slice(0, 80)).catch(function(){});
    } catch(_e) {}

    process.stdout.write('\n  ' + tui.dimText(fullTask.slice(0, 200)) + '\n');

    // Show orchestration plan
    var plugins = require("./plugins");
    var detection = plugins.detectPlugins();
    var plan = plugins.buildDispatchPlan(detection);
    if (detection.installed.length > 0) {
      process.stdout.write("\n" + tui.divider("Build Pipeline") + "\n");
      plan.forEach(function(step) {
        var icon = step.hasPlugin ? tui.colorText("v", tui.getTheme().success) : tui.dimText("o");
        process.stdout.write("  " + icon + " " + step.name + " " + tui.dimText("-> " + step.tool) + "\n");
      });
      process.stdout.write("  " + tui.dimText(plugins.getAttribution(detection.installed)) + "\n");
    }

    var sp = tui.spinner('Dispatching to Claude Code (plan mode)...');
    sp.start();

    var d = getDispatcher();
    var defaults = d.getDefaultsForLevel(userLevel);

    // Build system prompt with plugins + knowledge + Linear MCP context
    var sysPrompt = (function() {
      var knowledge = require("./knowledge");
      var knowledgePrompt = knowledge.buildKnowledgePrompt(fullTask);
      var pluginsMod = require("./plugins");
      var det = pluginsMod.detectPlugins();
      var dispPlan = pluginsMod.buildDispatchPlan(det);
      var pluginInstructions = dispPlan.filter(function(s){return s.hasPlugin;}).map(function(s){return s.name + ": use " + s.tool;}).join(". ");
      var prompt = "Start with a plan. Present it before implementing." + (pluginInstructions ? " Use these tools in sequence: " + pluginInstructions + "." : "");
      var cs = state.loadState();
      if (cs.activeProject) { try { var pi = require("./project-importer"); var proj = pi.scanProject(cs.activeProject.dir); prompt += "\n\n" + pi.buildProjectPrompt(proj); } catch(_e) {} }
      // Linear MCP context injection
      var linearCtx = "";
      try {
        var lm = require("./integrations/linear");
        if (!lm.validateAuth()) {
          var sess = state.getSession(session.id);
          if (sess && sess.linearIssueId) {
            linearCtx = "\n\n## Linear Integration\nLinear MCP tools available (mcp__linear__*). Current issue: " + sess.linearIssueIdentifier + " (ID: " + sess.linearIssueId + "). Update progress via mcp__linear__save_comment. Mark done via mcp__linear__save_issue when complete.";
          }
        }
      } catch(_e) {}
      return prompt + knowledgePrompt + linearCtx;
    })();

    try {
      sp.stop(true); // stop spinner before streaming starts
      var result = await d.dispatch(fullTask, {
        stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort,
        model: defaults.model, maxBudgetUsd: defaults.maxBudgetUsd,
        permissionMode: "plan", fallbackModel: "sonnet", bare: true,
        name: d.generateSessionName(fullTask), systemPrompt: sysPrompt
      });
      state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
      state.completeSession(session.id, 'success');
      try { var knowledge2 = require("./knowledge"); knowledge2.extractAndStore(state.getSession(session.id) || {task:fullTask,cost:0}, result.result || ""); } catch(_e) {}
      // Sync completion to Linear + post update + pulse
      try {
        var linearDone = require("./integrations/linear");
        var doneSession = state.getSession(session.id);
        if (doneSession) {
          linearDone.syncSession(doneSession, "success").catch(function(){});
          linearDone.postSessionSummary(doneSession).catch(function(){});
          linearDone.pulse("session_end", (doneSession.task || "").slice(0, 80)).catch(function(){});
        }
      } catch(_e) {}
      // Generate session replay
      try { var replay = require("./session-replay"); var r = replay.generateReplay(state.getSession(session.id)); if (r) { replay.saveReplay(r); replay.postToLinear(r).catch(function(){}); process.stdout.write('\n  ' + tui.dimText('Session replay saved. Score: ' + r.score.total + '/100') + '\n'); } } catch(_e) {}
      process.stdout.write(tui.celebrate('BUILD COMPLETE'));
      if (result.result) { var summary = typeof result.result === 'string' ? result.result.slice(0, 500) : JSON.stringify(result.result).slice(0, 500); process.stdout.write('\n  ' + summary + '\n'); }
    } catch (err) {
      sp.stop(false);
      // Sync error to Linear
      try { var linearErr = require("./integrations/linear"); var errSession = state.getSession(session.id); if (errSession) linearErr.syncSession(errSession, "error").catch(function(){}); } catch(_e) {}
      state.completeSession(session.id, 'error');
      process.stdout.write('\n  Error: ' + err.message + '\n');
      process.stdout.write('  Tip: npm i -g @anthropic-ai/claude-code\n');
    }
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask('\n  Press Enter...');
  }

  async executeBuildFromIssue(issue) {
    var fullTask = issue.title;
    var session = state.createSession({ task: fullTask, project: null });
    state.updateSession(session.id, { linearIssueId: issue.id, linearIssueIdentifier: issue.identifier || null });
    process.stdout.write('\n  ' + tui.boldText(issue.identifier + ': ' + fullTask, tui.getTheme().primary) + '\n');
    var sp = tui.spinner('Dispatching to Claude Code...');
    sp.start();
    var d = getDispatcher();
    var currentState = state.loadState();
    var defaults = d.getDefaultsForLevel(state.getUserLevel(currentState));
    var sysPrompt = (function() {
      var knowledge = require("./knowledge");
      var knowledgePrompt = knowledge.buildKnowledgePrompt(fullTask);
      var prompt = "Start with a plan. Present it before implementing.";
      var cs = state.loadState();
      if (cs.activeProject) { try { var pi = require("./project-importer"); var proj = pi.scanProject(cs.activeProject.dir); prompt += "\n\n" + pi.buildProjectPrompt(proj); } catch(_e) {} }
      prompt += "\n\n## Linear Integration\nLinear MCP tools available (mcp__linear__*). Current issue: " + issue.identifier + " (ID: " + issue.id + "). Update progress via mcp__linear__save_comment. Mark done via mcp__linear__save_issue when complete.";
      return prompt + knowledgePrompt;
    })();
    try {
      sp.stop(true); // stop spinner before streaming starts
      var result = await d.dispatch(fullTask, {
        stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort,
        model: defaults.model, maxBudgetUsd: defaults.maxBudgetUsd,
        permissionMode: "plan", fallbackModel: "sonnet", bare: true,
        name: d.generateSessionName(fullTask), systemPrompt: sysPrompt
      });
      state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
      state.completeSession(session.id, 'success');
      try { var knowledge2 = require("./knowledge"); knowledge2.extractAndStore(state.getSession(session.id) || {task:fullTask,cost:0}, result.result || ""); } catch(_e) {}
      try { var linearDone = require("./integrations/linear"); var doneSession = state.getSession(session.id); if (doneSession) linearDone.syncSession(doneSession, "success").catch(function(){}); } catch(_e) {}
      process.stdout.write(tui.celebrate('BUILD COMPLETE'));
    } catch (err) {
      sp.stop(false);
      try { var linearErr = require("./integrations/linear"); var errSession = state.getSession(session.id); if (errSession) linearErr.syncSession(errSession, "error").catch(function(){}); } catch(_e) {}
      state.completeSession(session.id, 'error');
      process.stdout.write('\n  Error: ' + err.message + '\n');
    }
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask('\n  Press Enter...');
  }

  async runSpecFlow(task, level) {
    if (level === 'power') return { enrichedTask: task, answers: {} };
    process.stdout.write('\n' + tui.divider('Clarification') + '\n\n');
    var answers = {};
    var goalIdx = await tui.select([{ label: 'Something that works end-to-end' }, { label: 'A solid foundation to build on' }, { label: 'A quick prototype' }], '1. Most important outcome?');
    var goals = ['Build complete end-to-end.', 'Solid foundation, clean architecture.', 'Quick prototype to validate.'];
    answers.goal = goals[goalIdx >= 0 ? goalIdx : 0];
    var techIdx = await tui.select([{ label: 'Pick the best for me' }, { label: 'Popular/mainstream tools' }, { label: 'As simple as possible' }], '2. Tech preferences?');
    var techs = ['Best tech stack for the job.', 'Popular, well-documented tools.', 'Minimal dependencies, simple as possible.'];
    answers.tech = techs[techIdx >= 0 ? techIdx : 0];
    var scopeIdx = await tui.select([{ label: 'Just the basics' }, { label: 'With tests and error handling' }, { label: 'Production-ready with docs' }], '3. How thorough?');
    var scopes = ['Basics only, iterate later.', 'Include tests and error handling.', 'Production-ready with docs and tests.'];
    answers.scope = scopes[scopeIdx >= 0 ? scopeIdx : 0];
    return { enrichedTask: task + '\n\nRequirements:\n- ' + answers.goal + '\n- ' + answers.tech + '\n- ' + answers.scope, answers: answers };
  }

  async resumeSession(session) {
    var sp = tui.spinner('Resuming session...');
    sp.start();
    var d = getDispatcher();
    var currentState = state.loadState();
    var defaults = d.getDefaultsForLevel(state.getUserLevel(currentState));
    try {
      sp.stop(true);
      var result = await d.dispatch('Continue: ' + session.task, { stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort, permissionMode: 'plan', fallbackModel: 'sonnet', bare: true, resume: session.claudeSessionId || undefined });
      state.updateSession(session.id, { cost: (session.cost || 0) + (result.cost_usd || 0) });
      process.stdout.write(tui.celebrate('Progress made!'));
    } catch (err) { sp.stop(false); process.stdout.write('\n  Could not resume: ' + err.message + '\n'); }
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask('\n  Press Enter...');
  }

  async browseSkills(megaOnly) {
    var sb = getSkillBrowser();
    var all = sb.listSkills();
    var skills = megaOnly ? all.filter(function(s) { return s.isMega; }) : all;
    if (skills.length === 0) { process.stdout.write('\n  No skills found.\n'); await this.pause(2000); return { next: 'learn-skill' }; }
    var page = skills.slice(0, 10);
    var items = page.map(function(s) { return { label: s.name, description: s.description ? s.description.slice(0, 50) : '' }; });
    items.push({ label: 'Back' });
    process.stdout.write('\n' + tui.divider((megaOnly ? 'Mega-' : '') + 'Skills (' + skills.length + ' total)') + '\n\n');
    var idx = await tui.select(items, 'Pick a skill to preview:');
    if (idx < 0 || idx >= page.length) return { next: 'learn-skill' };
    var skill = page[idx];
    var preview = sb.getSkillPreview(skill.path);
    process.stdout.write('\n' + tui.divider(skill.name) + '\n');
    process.stdout.write('  ' + tui.dimText(preview) + '\n\n');
    var actionIdx = await tui.select([{ label: 'Try it now' }, { label: 'Back' }], 'What next?');
    if (actionIdx === 0) { await this.executeBuild('Use the /' + skill.dirName + ' skill'); return { next: 'main-menu' }; }
    return { next: 'learn-skill' };
  }

  async showCheatsheet() {
    var fs = require('fs');
    var paths = [path.join(__dirname, '..', 'CHEATSHEET.md'), path.join(require('os').homedir(), '.claude', 'CHEATSHEET.md')];
    var content = null;
    for (var p of paths) { try { if (fs.existsSync(p)) { content = fs.readFileSync(p, 'utf8'); break; } } catch (_e) {} }
    if (!content) { process.stdout.write('\n  Cheatsheet not found.\n'); await this.pause(2000); return { next: 'learn-skill' }; }
    process.stdout.write('\n' + tui.dimText(content.split('\n').slice(0, 40).join('\n')) + '\n');
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask('\n  Press Enter...');
    return { next: 'learn-skill' };
  }

  async recommendSkill(currentState) {
    var recs;
    try { var rec = require('./recommendations'); var stats = getStats().getStats ? getStats().getStats() : {}; recs = rec.getRecommendations(currentState, stats); } catch (_e) { recs = []; }
    var top = recs.slice(0, 3);
    if (top.length === 0) { process.stdout.write('\n  No recommendations yet.\n'); await this.pause(2000); return { next: 'learn-skill' }; }
    var items = top.map(function(r) { return { label: (r.emoji || '>') + ' ' + r.text }; });
    items.push({ label: 'Back' });
    var idx = await tui.select(items, 'Recommendations:');
    if (idx >= 0 && idx < top.length && top[idx].action) { await this.executeBuild(top[idx].action); return { next: 'main-menu' }; }
    return { next: 'learn-skill' };
  }

  async pickSessionToResume() {
    var sessions = state.listSessions(10);
    if (sessions.length === 0) { process.stdout.write('\n  No sessions.\n'); await this.pause(1500); return { next: 'main-menu' }; }
    var items = sessions.map(function(s) { return { label: (s.task || 'Untitled').slice(0, 50), description: s.status === 'completed' ? 'done' : 'active' }; });
    items.push({ label: 'Back' });
    var idx = await tui.select(items, 'Resume which session?');
    if (idx >= 0 && idx < sessions.length) { await this.resumeSession(sessions[idx]); }
    return { next: 'main-menu' };
  }

  async pickSessionDetails() {
    var sessions = state.listSessions(10);
    if (sessions.length === 0) { process.stdout.write('\n  No sessions.\n'); await this.pause(1500); return { next: 'main-menu' }; }
    var items = sessions.map(function(s) { return { label: (s.task || 'Untitled').slice(0, 50) }; });
    items.push({ label: 'Back' });
    var idx = await tui.select(items, 'View details:');
    if (idx >= 0 && idx < sessions.length) {
      process.stdout.write('\n' + this.renderSession(sessions[idx]) + '\n');
      var actionIdx = await tui.select([{ label: 'Resume' }, { label: 'Back' }], 'What next?');
      if (actionIdx === 0) { await this.resumeSession(sessions[idx]); return { next: 'main-menu' }; }
    }
    return { next: 'review-work' };
  }

  renderSession(s) {
    var t = tui.getTheme();
    var duration = s.duration ? Math.round(s.duration / 60) + 'm' : 'ongoing';
    var cost = s.cost ? '$' + s.cost.toFixed(2) : '$0.00';
    var icon = s.status === 'completed' ? tui.colorText('v', t.success) : tui.colorText('o', t.primary);
    return '  ' + icon + ' ' + tui.boldText(s.task || 'Untitled', t.text) + '\n  ' + tui.dimText('Duration: ' + duration + '  |  Cost: ' + cost + '  |  ' + new Date(s.startTime).toLocaleDateString());
  }

  async changeTheme() {
    var themeNames = tui.getThemeNames();
    var items = tui.themePickerItems();
    var currentTheme = tui.getTheme().name;
    process.stdout.write("\n" + tui.divider("Theme Picker") + "\n\n");
    process.stdout.write("  " + tui.dimText("Navigate to preview live. Enter to confirm.") + "\n\n");
    var idx = await tui.select(items, "Pick a theme:", {
      onChange: function(i) {
        // Live preview: switch theme as you navigate
        if (i >= 0 && i < themeNames.length) {
          tui.setTheme(themeNames[i]);
        }
      }
    });
    if (idx >= 0 && idx < themeNames.length) {
      tui.setTheme(themeNames[idx]);
      state.updateState({ theme: themeNames[idx] });
      process.stdout.write(tui.celebrate("Theme: " + tui.getTheme().name));
      await this.pause(800);
    } else {
      // Cancelled — restore previous theme
      var prevName = themeNames.find(function(n) { return tui.THEMES[n].name === currentTheme; });
      if (prevName) tui.setTheme(prevName);
    }
    return { next: "main-menu" };
  }

  async yoloLoop() {
    process.stdout.write("\n" + tui.divider("YOLO LOOP") + "\n\n");
    process.stdout.write("  " + tui.boldText("YOLO Loop = continuous improvement until perfect.", tui.getTheme().primary) + "\n");
    process.stdout.write("  " + tui.dimText("After each build step, Commander reviews, tests, and iterates.") + "\n");
    process.stdout.write("  " + tui.dimText("Writes status to ~/.claude/commander/yolo-status.txt every cycle.") + "\n\n");
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    var task = await this.ask("  What should the loop work on? > ");
    if (!task.trim()) return { next: "night-build" };
    var maxCycles = 5;
    var cycleIdx = await tui.select([{label:"3 cycles"},{label:"5 cycles"},{label:"10 cycles"}], "How many improvement cycles?");
    var cycles = [3, 5, 10];
    maxCycles = cycles[cycleIdx >= 0 ? cycleIdx : 1];
    process.stdout.write("\n  " + tui.boldText("Launching YOLO Loop: " + maxCycles + " cycles", tui.getTheme().primary) + "\n\n");
    var d = getDispatcher();
    var knowledge = require("./knowledge");
    var fs = require("fs");
    var path = require("path");
    var statusPath = path.join(require("os").homedir(), ".claude", "commander", "yolo-status.txt");
    for (var cycle = 1; cycle <= maxCycles; cycle++) {
      var sp = tui.spinner("Cycle " + cycle + "/" + maxCycles + ": " + (cycle === 1 ? "Building" : "Improving") + "...");
      sp.start();
      var session = state.createSession({ task: "YOLO cycle " + cycle + ": " + task, project: null });

      // Sync to Linear — capture issue
      try {
        var yoloLinear = require("./integrations/linear");
        var yoloIssue = await yoloLinear.syncSession(session, "started");
        if (yoloIssue && yoloIssue.id) state.updateSession(session.id, { linearIssueId: yoloIssue.id, linearIssueIdentifier: yoloIssue.identifier || null });
      } catch(_e) {}

      var prompt = cycle === 1 ? task : "Review and improve the previous work on: " + task + ". Fix any issues. Add missing tests. Improve quality.";
      var knowledgePrompt = knowledge.buildKnowledgePrompt(task);
      try {
        fs.writeFileSync(statusPath, "YOLO Loop: cycle " + cycle + "/" + maxCycles + " | " + new Date().toISOString() + " | Task: " + task);
        sp.stop(true);
        var result = await d.dispatch(prompt, { stream: true, maxTurns: Math.round(100 / maxCycles), effort: cycle === 1 ? "high" : "medium", model: "opusplan", maxBudgetUsd: Math.round(10 / maxCycles), permissionMode: "plan", fallbackModel: "sonnet", bare: true, name: d.generateSessionName("yolo-" + cycle + "-" + task), systemPrompt: "YOLO Loop cycle " + cycle + "/" + maxCycles + ". " + (cycle === 1 ? "Build from scratch." : "Review previous work. Fix issues. Add tests. Ship quality.") + knowledgePrompt });
        state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
        state.completeSession(session.id, "success");
        knowledge.extractAndStore(state.getSession(session.id) || session, result.result || "");
        try { var yoloDone = require("./integrations/linear"); var yoloDoneSession = state.getSession(session.id); if (yoloDoneSession) yoloDone.syncSession(yoloDoneSession, "success").catch(function(){}); } catch(_e) {}
        process.stdout.write("  " + tui.colorText("Cycle " + cycle + " complete", tui.getTheme().success) + "\n");
      } catch (err) {
        sp.stop(false);
        try { var yoloErr = require("./integrations/linear"); var yoloErrSession = state.getSession(session.id); if (yoloErrSession) yoloErr.syncSession(yoloErrSession, "error").catch(function(){}); } catch(_e) {}
        state.completeSession(session.id, "error");
        process.stdout.write("  Cycle " + cycle + " error: " + err.message + "\n");
      }
    }
    try { fs.writeFileSync(statusPath, "YOLO Loop COMPLETE | " + new Date().toISOString() + " | " + maxCycles + " cycles | Task: " + task); } catch(_e) {}
    process.stdout.write(tui.celebrate("YOLO LOOP COMPLETE — " + maxCycles + " cycles"));
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask("\n  Press Enter...");
    return { next: "main-menu" };
  }

  async quit() {
    process.stdout.write('\n  See you next time!\n');
    process.stdout.write('  ' + tui.dimText(BRAND.footer) + '\n\n');
    this.running = false;
    if (this.rl) this.rl.close();
  }

  ask(prompt) { return new Promise(function(resolve) { this.rl.question(prompt, function(answer) { resolve(answer); }); }.bind(this)); }
  pause(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }
}

module.exports = KitCommander;
