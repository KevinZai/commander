'use strict';

var readline = require('readline');
var path = require('path');
var adventure = require('./adventure');
var tui = require('./tui');
var state = require('./state');
var BRAND = require('./branding');

// Send status to the tmux right pane (Claude side) if in split mode
function tmuxStatus(msg) {
  if (!process.env.CCC_TMUX_SESSION) return;
  try {
    var cp = require('child_process');
    var session = process.env.CCC_TMUX_SESSION;
    var safeMsg = String(msg).replace(/[`$\\]/g, '').slice(0, 120);
    cp.execFileSync('tmux', ['display-message', '-t', session, '-d', '3000', ' CCC: ' + safeMsg], { stdio: 'pipe' });
  } catch(_e) {}
}

// Check if we're in ccc-split tmux session
function inSplitMode() {
  return !!process.env.CCC_TMUX_SESSION;
}

// Send a claude command to the right tmux pane instead of running headless
// Dispatch counter for naming panes
var dispatchCounter = 0;

function tmuxDispatch(task, resumeSessionId) {
  try {
    var cp = require('child_process');
    var crypto = require('crypto');
    var claudeBin = require('./claude-finder').resolve();
    var sessionName = process.env.CCC_TMUX_SESSION || 'ccc';
    var sessionId = resumeSessionId || crypto.randomUUID();
    dispatchCounter++;
    var paneTitle = 'claude-' + dispatchCounter;

    // Count current panes
    var paneCount = 1;
    try {
      paneCount = parseInt(cp.execFileSync('tmux', ['display-message', '-p', '-t', sessionName, '#{window_panes}'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10) || 1;
    } catch(_e) {}

    // Create pane
    if (paneCount === 1) {
      cp.execFileSync('tmux', ['split-window', '-h', '-t', sessionName, '-l', '75%'], { stdio: 'pipe' });
    } else {
      var lastPane = paneCount - 1;
      cp.execFileSync('tmux', ['select-pane', '-t', sessionName + ':.' + lastPane], { stdio: 'pipe' });
      cp.execFileSync('tmux', ['split-window', '-h', '-t', sessionName], { stdio: 'pipe' });
    }

    // Set pane title
    cp.execFileSync('tmux', ['select-pane', '-T', paneTitle], { stdio: 'pipe' });

    // Launch Claude with session persistence
    // Validate sessionId: strict allowlist to prevent shell injection
    if (!/^[a-zA-Z0-9._:-]+$/.test(sessionId)) {
      sessionId = crypto.randomUUID(); // replace tainted ID with safe one
    }
    if (resumeSessionId) {
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, '-l', claudeBin + ' --resume ' + sessionId + ' --continue'], { stdio: 'pipe' });
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, 'Enter'], { stdio: 'pipe' });
    } else {
      // Start interactive Claude, then send task as user input after a brief pause
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, '-l', claudeBin + ' --session-id ' + sessionId], { stdio: 'pipe' });
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, 'Enter'], { stdio: 'pipe' });
      cp.execSync('sleep 0.3', { stdio: 'pipe' });
      // Sanitize task: strip control chars, limit length
      var safeTask = String(task || '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 4000);
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, '-l', safeTask], { stdio: 'pipe' });
      cp.execFileSync('tmux', ['send-keys', '-t', sessionName, 'Enter'], { stdio: 'pipe' });
    }

    // Return focus to menu pane
    cp.execFileSync('tmux', ['select-pane', '-t', sessionName + ':.0'], { stdio: 'pipe' });

    // Rebalance layout
    try {
      cp.execFileSync('tmux', ['select-layout', '-t', sessionName, 'main-vertical'], { stdio: 'pipe' });
      cp.execFileSync('tmux', ['resize-pane', '-t', sessionName + ':.0', '-x', '35'], { stdio: 'pipe' });
    } catch(_e) {}

    return sessionId;
  } catch(_e) { return null; }
}

var cockpit = require('./cockpit');
var S = tui.S;

// Wrap a dispatch promise with cancel-on-keypress (Escape or 'q')
function cancellableDispatch(dispatchPromise, label) {
  return new Promise(function(resolve, reject) {
    var cancelled = false;
    var proc = dispatchPromise.childProcess;

    // Show cancel hint
    process.stdout.write('  \x1b[38;5;240mPress Escape or q to cancel\x1b[0m\n\n');

    // Listen for cancel keys (raw mode)
    var wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      var onKey = function(key) {
        // Escape = \x1b, q = 0x71, Ctrl+C = \x03
        if (key[0] === 0x1b || key[0] === 0x71 || key[0] === 0x03) {
          cancelled = true;
          process.stdin.removeListener('data', onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw || false);
          process.stdin.pause();
          if (proc) {
            try { proc.kill('SIGTERM'); } catch(_) {}
          }
          process.stdout.write('\n\n  \x1b[38;5;208mCancelled: ' + (label || 'task') + '\x1b[0m\n');
          resolve({ result: 'Cancelled by user', session_id: null, cost_usd: 0, cancelled: true });
        }
      };
      process.stdin.on('data', onKey);

      dispatchPromise.then(function(result) {
        if (!cancelled) {
          process.stdin.removeListener('data', onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw || false);
          process.stdin.pause();
          resolve(result);
        }
      }).catch(function(err) {
        if (!cancelled) {
          process.stdin.removeListener('data', onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw || false);
          process.stdin.pause();
          reject(err);
        }
      });
    } else {
      // Not a TTY, just pass through
      dispatchPromise.then(resolve).catch(reject);
    }
  });
}


var dispatcher = null;
function getDispatcher() { if (!dispatcher) dispatcher = require('./dispatcher'); return dispatcher; }

var kitStats = null;
function getStats() {
  if (!kitStats) { try { kitStats = require('../lib/kit-stats'); } catch (_e) { kitStats = { getStats: function() { return {}; }, getStreak: function() { return { current: 0 }; }, getAchievements: function() { return []; } }; } }
  return kitStats;
}

var skillBrowser = null;
function getSkillBrowser() { if (!skillBrowser) skillBrowser = require('./skill-browser'); return skillBrowser; }

// --- Dynamic action dispatcher ---
var actionModules = {};
function getActionHandler(name) {
  if (!actionModules._loaded) {
    var fs = require('fs');
    var actionsDir = path.join(__dirname, 'actions');
    if (fs.existsSync(actionsDir)) {
      fs.readdirSync(actionsDir).filter(function(f) { return f.endsWith('.js'); }).forEach(function(f) {
        try {
          var mod = require(path.join(actionsDir, f));
          Object.keys(mod).forEach(function(k) {
            if (k !== '_loaded') actionModules[k] = mod[k];
          });
        } catch(_e) {}
      });
    }
    actionModules._loaded = true;
  }
  return actionModules[name] || null;
}

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
          try { require('./integrations/linear').pulse('claude_md_loaded', detectedName).catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'linear-pulse-load'); } catch(_) {} }
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
      // Session bookend — always visible just above menu
      if (adventureId === 'main-menu') {
        process.stdout.write('  ' + tui.colorText(S.BAR_START + '  CC Commander v' + BRAND.version, tui.getTheme().dim) + '\n');
      }
      process.stdout.write(tui.divider(prepared.title) + '\n\n');

      // Arrow-key menu
      var menuItems = (activeChoices || []).map(function(ch) {
        if (ch.separator) return { separator: true };
        return { label: ch.label, description: ch.description || '', key: ch.key, action: ch.action, next: ch.next };
      });
      var idx = await tui.select(menuItems, activePrompt || 'Choose:');

      if (idx < 0 || idx >= menuItems.length) { continue; }
      var choice = activeChoices[idx];

      if (choice.action === 'quit') { await this.quit(); return; }

      if (choice.action) {
        try {
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
        } catch (actionError) {
          var _errId = '';
          try { _errId = require('./error-logger').logError(actionError, 'runAdventure'); } catch(_) {}
          process.stdout.write('\x0a  \u274C CC Commander error: ' + (actionError.message || 'Unknown error') + '\x0a');
          if (_errId) process.stdout.write('  Error ID: ' + _errId + ' \u2014 report at: https://github.com/KevinZai/cc-commander/issues\x0a');
          adventureId = 'main-menu';
          continue;
        }
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

    // Dynamic dispatch: load handler from actions/ modules
    var handler = getActionHandler(actionName);
    if (handler) {
      try {
        return await handler(this, tui, state, choice);
      } catch(_e) {
        var _eId = '';
        try { _eId = require('./error-logger').logError(_e, 'action:' + actionName); } catch(_) {}
        process.stdout.write('\n  \u274C ' + actionName + ' error: ' + (_e.message || 'Unknown error') + '\n');
        if (_eId) process.stdout.write('  Error ID: ' + _eId + ' \u2014 report at: https://github.com/KevinZai/cc-commander/issues\n');
        return { next: 'main-menu' };
      }
    }

    // Built-in actions not in external modules
    switch (actionName) {
      case 'quit': await this.quit(); return null;
      case 'back': return { next: 'main-menu' };
      default:
        process.stdout.write('\n  Unknown action: ' + actionName + '\n');
        await this.pause(1000);
        return { next: 'main-menu' };
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
    } catch(_e) { try { require('./error-logger').log(_e, 'linear-sync-start'); } catch(_) {} }

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

    // Intelligence Layer: task complexity scoring
    var complexity = d.scoreComplexity(fullTask);
    if (complexity) {
      if (complexity.turns > defaults.maxTurns) defaults.maxTurns = complexity.turns;
      if (complexity.budget > defaults.maxBudgetUsd) defaults.maxBudgetUsd = complexity.budget;
      if (complexity.effort) defaults.effort = complexity.effort;
    }

    // Build system prompt with plugins + knowledge + Linear MCP context
    var sysPrompt = (function() {
      var knowledge = require("./knowledge");
      var knowledgePrompt = knowledge.buildKnowledgePrompt(fullTask);
      var pluginsMod = require("./plugins");
      var det = pluginsMod.detectPlugins();
      var dispPlan = pluginsMod.buildDispatchPlan(det);
      var pluginInstructions = dispPlan.filter(function(s){return s.hasPlugin;}).map(function(s){return s.name + ": use " + s.tool;}).join(". ");
      var prompt = "## CCC Project Manager (Opus)\n" +
        "You are a senior PM. ALWAYS plan first (Opus reasoning), delegate ALL implementation to Sonnet workers, then audit ALL results yourself (Opus).\n\n" +
        "## Workflow\n" +
        "1. UNDERSTAND: Ask clarifying questions via AskUserQuestion.\n" +
        "2. RECOMMEND: Present 2-3 approaches with reasoning. Suggest CCC skill and why.\n" +
        "3. PLAN: Break into numbered steps. Show plan. Get user approval.\n" +
        "4. DELEGATE: Spawn Sonnet subagents (Agent tool, model=sonnet) for ALL code/research. Parallelize independent tasks.\n" +
        "5. MONITOR: Show ASCII progress after each agent completes:\n" +
        "   [1] Task  [████████████████████] 100% done\n" +
        "   [2] Task  [████████████░░░░░░░░]  60% running\n" +
        "   Overall: 60% | 1/2 done\n" +
        "6. AUDIT (Opus): Review ALL subagent work. Run tests. Verify quality. Only done after YOUR audit passes.\n" +
        "7. REPORT: Final summary — files, tests, cost.\n\n" +
        "## Rules\n" +
        "- NEVER write code. ALWAYS delegate to Sonnet subagents.\n" +
        "- ALWAYS use AskUserQuestion for decisions.\n" +
        "- ALWAYS show ASCII progress bars.\n" +
        "- Keep responses SHORT: bullets, tables, bars.\n" +
        "- After every action: What next? via AskUserQuestion.\n\n" +
        "## Skill Suggestions (proactive)\n" +
        "Feature: spec-interviewer | Code: tdd-workflow | Bug: systematic-debugging | Review: review | Deploy: deploy-check | UI: ccc-design | SEO: ccc-seo | Security: ccc-security | Ship: qa/e2e\n" +
        "Suggest: I recommend [skill] because [reason]. AskUserQuestion: use / skip / others."
      var cs = state.loadState();
      if (cs.activeProject) { try { var pi = require("./project-importer"); var proj = pi.scanProject(cs.activeProject.dir); prompt += "\n\n" + pi.buildProjectPrompt(proj); } catch(_e) {} }
      // Linear MCP context injection
      var linearCtx = "";
      try {
        var lm = require("./integrations/linear");
        if (lm.validateAuth()) {
          var sess = state.getSession(session.id);
          if (sess && sess.linearIssueId) {
            linearCtx = "\n\n## Linear Integration\nLinear MCP tools available (mcp__linear__*). Current issue: " + sess.linearIssueIdentifier + " (ID: " + sess.linearIssueId + "). Update progress via mcp__linear__save_comment. Mark done via mcp__linear__save_issue when complete.";
          }
        }
      } catch(_e) {}
      // Intelligence Layer: relevant skills for this project
      var skillHint = '';
      try {
        var projectStack = [];
        var cs2 = state.loadState();
        if (cs2.activeProject) { try { projectStack = require('./project-importer').scanProject(cs2.activeProject.dir).techStack || []; } catch(_) {} }
        if (projectStack.length > 0) {
          var sbr = require('./skill-browser');
          var topSkills = sbr.filterByProject(sbr.listSkills(), projectStack).slice(0, 8).map(function(s) { return s.name; });
          skillHint = '\n\nProject stack detected: ' + projectStack.join(', ') + '. Most relevant skills: ' + topSkills.join(', ') + '.';
        }
      } catch(_) {}
      return prompt + knowledgePrompt + linearCtx + skillHint;
    })();

    try {
      sp.stop(true);
      tmuxStatus('Building: ' + fullTask.slice(0, 60));
      try { var fs = require('fs'); var path = require('path'); fs.mkdirSync(path.join(require('os').homedir(), '.claude', 'commander'), { recursive: true }); fs.writeFileSync(path.join(require('os').homedir(), '.claude', 'commander', 'yolo-status.txt'), 'BUILD: ' + fullTask.slice(0, 200) + ' | ' + new Date().toISOString()); } catch(_e) {}

      if (inSplitMode()) {
        // Split mode: launch interactive Claude Code session the user can take over
        var claudeSessionId = tmuxDispatch(fullTask);
        if (claudeSessionId) {
          state.updateSession(session.id, { claudeSessionId: claudeSessionId });
        }
        process.stdout.write('\x0a  ' + tui.boldText('Dispatched to Claude pane \u2192', tui.getTheme().primary) + '\x0a');
        process.stdout.write('  ' + tui.dimText('Dispatched to pane ' + dispatchCounter + '. Ctrl+A \u2192 to switch.') + '\x0a');
        state.completeSession(session.id, 'dispatched');
      } else {
        // Simple mode: run headless with streaming output
        process.stdout.write('\x0a  ' + tui.dimText('Claude is working \u2014 live output below. Ctrl+C to cancel.') + '\x0a');
        process.stdout.write(tui.divider('Claude Output') + '\x0a\x0a');
        var dispatchP = d.dispatchWithRetry(fullTask, {
          stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort,
          model: defaults.model, maxBudgetUsd: defaults.maxBudgetUsd,
          fallbackModel: "sonnet", bare: false,
          name: d.generateSessionName(fullTask), systemPrompt: sysPrompt
        });
        var result = await cancellableDispatch(dispatchP, fullTask.slice(0, 60));
        if (result.cancelled) { state.completeSession(session.id, 'cancelled'); } else {
        state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
        state.completeSession(session.id, 'success');
        }
        try { var knowledge2 = require("./knowledge"); knowledge2.extractAndStore(state.getSession(session.id) || {task:fullTask,cost:0}, result.result || ""); } catch(_e) {}
      }
      if (!inSplitMode()) {
        // Only show completion UI in simple mode (split mode: Claude handles it in right pane)
        try {
          var linearDone = require("./integrations/linear");
          var doneSession = state.getSession(session.id);
          if (doneSession) {
            linearDone.syncSession(doneSession, "success").catch(function(){});
            linearDone.postSessionSummary(doneSession).catch(function(){});
            linearDone.pulse("session_end", (doneSession.task || "").slice(0, 80)).catch(function(){});
          }
        } catch(_e) { try { require('./error-logger').log(_e, 'linear-sync-done'); } catch(_) {} }
        try { var replay = require("./session-replay"); var r = replay.generateReplay(state.getSession(session.id)); if (r) { replay.saveReplay(r); replay.postToLinear(r).catch(function(){}); process.stdout.write('\n  ' + tui.dimText('Session replay saved. Score: ' + r.score.total + '/100') + '\n'); } } catch(_e) {}
        tmuxStatus('BUILD COMPLETE');
        try { require('fs').writeFileSync(require('path').join(require('os').homedir(), '.claude', 'commander', 'yolo-status.txt'), 'COMPLETE: ' + fullTask.slice(0, 200) + ' | ' + new Date().toISOString()); } catch(_e) {}
        process.stdout.write(tui.celebrate('BUILD COMPLETE'));
        if (result && result.result) { var summary = typeof result.result === 'string' ? result.result.slice(0, 500) : JSON.stringify(result.result).slice(0, 500); process.stdout.write('\n  ' + summary + '\n'); }
      }
    } catch (err) {
      try { sp.stop(false); } catch(_) {}
      try { require('./error-logger').log(err, 'executeBuild'); } catch(_) {}
      // Sync error to Linear
      try { var linearErr = require("./integrations/linear"); var errSession = state.getSession(session.id); if (errSession) linearErr.syncSession(errSession, "error").catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'linear-sync-error'); } catch(_) {} }
      state.completeSession(session.id, 'error');
      process.stdout.write('\n  Build failed: ' + (err.message || 'Unknown error') + '\n');
      process.stdout.write('  Check: ~/.claude/commander/error.log for details\n');
      if (err.message && err.message.includes('not found')) process.stdout.write('  Tip: npm i -g @anthropic-ai/claude-code\n');
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
      sp.stop(true);
      tmuxStatus('Building: ' + fullTask.slice(0, 60));
      try { var fs = require('fs'); var path = require('path'); fs.mkdirSync(path.join(require('os').homedir(), '.claude', 'commander'), { recursive: true }); fs.writeFileSync(path.join(require('os').homedir(), '.claude', 'commander', 'yolo-status.txt'), 'BUILD: ' + fullTask.slice(0, 200) + ' | ' + new Date().toISOString()); } catch(_e) {}

      if (inSplitMode()) {
        // Split mode: launch interactive Claude Code session the user can take over
        var claudeSessionId = tmuxDispatch(fullTask);
        if (claudeSessionId) {
          state.updateSession(session.id, { claudeSessionId: claudeSessionId });
        }
        process.stdout.write('\x0a  ' + tui.boldText('Dispatched to Claude pane \u2192', tui.getTheme().primary) + '\x0a');
        process.stdout.write('  ' + tui.dimText('Dispatched to pane ' + dispatchCounter + '. Ctrl+A \u2192 to switch.') + '\x0a');
        state.completeSession(session.id, 'dispatched');
      } else {
        // Simple mode: run headless with streaming output
        process.stdout.write('\x0a  ' + tui.dimText('Claude is working \u2014 live output below. Ctrl+C to cancel.') + '\x0a');
        process.stdout.write(tui.divider('Claude Output') + '\x0a\x0a');
        var dispatchP = d.dispatchWithRetry(fullTask, {
          stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort,
          model: defaults.model, maxBudgetUsd: defaults.maxBudgetUsd,
          fallbackModel: "sonnet", bare: false,
          name: d.generateSessionName(fullTask), systemPrompt: sysPrompt
        });
        var result = await cancellableDispatch(dispatchP, fullTask.slice(0, 60));
        if (result.cancelled) { state.completeSession(session.id, 'cancelled'); } else {
        state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
        state.completeSession(session.id, 'success');
        }
        try { var knowledge2 = require("./knowledge"); knowledge2.extractAndStore(state.getSession(session.id) || {task:fullTask,cost:0}, result.result || ""); } catch(_e) {}
      }
      if (!inSplitMode()) {
        try { var linearDone = require("./integrations/linear"); var doneSession = state.getSession(session.id); if (doneSession) linearDone.syncSession(doneSession, "success").catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'linear-issue-done'); } catch(_) {} }
        tmuxStatus('BUILD COMPLETE');
        try { require('fs').writeFileSync(require('path').join(require('os').homedir(), '.claude', 'commander', 'yolo-status.txt'), 'COMPLETE: ' + fullTask.slice(0, 200) + ' | ' + new Date().toISOString()); } catch(_e) {}
        process.stdout.write(tui.celebrate('BUILD COMPLETE'));
      }
    } catch (err) {
      sp.stop(false);
      try { var linearErr = require("./integrations/linear"); var errSession = state.getSession(session.id); if (errSession) linearErr.syncSession(errSession, "error").catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'linear-issue-error'); } catch(_) {} }
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
      tmuxStatus('Resuming: ' + (session.task || 'previous session').slice(0, 60));
      process.stdout.write('\x0a' + tui.divider('Resuming Session') + '\x0a\x0a');
      process.stdout.write('  ' + tui.dimText('Task: ' + (session.task || 'unknown').slice(0, 120)) + '\x0a');
      if (inSplitMode() && session.claudeSessionId) {
        tmuxDispatch(null, session.claudeSessionId);
        process.stdout.write('  ' + tui.boldText('Resumed in Claude pane \u2192', tui.getTheme().primary) + '\x0a');
        process.stdout.write('  ' + tui.dimText('Session resumed in pane. Ctrl+A \u2192 to switch.') + '\x0a');
      } else {
        process.stdout.write('  ' + tui.dimText('Claude is working \u2014 live output below.') + '\x0a\x0a');
        var result = await d.dispatch('Continue: ' + session.task, { stream: true, maxTurns: defaults.maxTurns, effort: defaults.effort, fallbackModel: 'sonnet', bare: false, resume: session.claudeSessionId || undefined });
        state.updateSession(session.id, { cost: (session.cost || 0) + (result.cost_usd || 0) });
        tmuxStatus('RESUME COMPLETE \u2714');
        process.stdout.write(tui.celebrate('Progress made!'));
      }
    } catch (err) { try { sp.stop(false); } catch(_) {} tmuxStatus('RESUME FAILED'); process.stdout.write('\n  Could not resume: ' + err.message + '\n'); }
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
    var safe = (s && typeof s === 'object') ? s : {};
    var durationSec = Number(safe.duration);
    var duration = Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec / 60) + 'm' : 'ongoing';
    var costNum = Number(safe.cost);
    var cost = Number.isFinite(costNum) ? '$' + costNum.toFixed(2) : '$0.00';
    var status = typeof safe.status === 'string' ? safe.status : 'active';
    var task = typeof safe.task === 'string' && safe.task.trim() ? safe.task : 'Untitled';
    var startDate = new Date(safe.startTime);
    var dateLabel = Number.isFinite(startDate.getTime()) ? startDate.toLocaleDateString() : 'Unknown date';
    var icon = status === 'completed' ? tui.colorText('v', t.success) : tui.colorText('o', t.primary);
    return '  ' + icon + ' ' + tui.boldText(task, t.text) + '\n  ' + tui.dimText('Duration: ' + duration + '  |  Cost: ' + cost + '  |  ' + dateLabel);
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

  async nightBuild() {
    process.stdout.write("\n" + tui.divider("Night Build") + "\n\n");
    process.stdout.write("  " + tui.boldText("Autonomous build — spec, code, test, ship.", tui.getTheme().primary) + "\n");
    process.stdout.write("  " + tui.dimText("Answer 3 questions, then Claude builds it overnight.") + "\n\n");
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    var task = await this.ask("  What should Claude build? > ");
    if (!task.trim()) return { next: "night-build" };
    await this.executeBuild(task.trim());
    return { next: "main-menu" };
  }

  async yoloLoop() {
    process.stdout.write("\n" + tui.divider("YOLO LOOP") + "\n\n");
    process.stdout.write("  " + tui.boldText("YOLO Loop = continuous improvement until perfect.", tui.getTheme().primary) + "\n");
    process.stdout.write("  " + tui.dimText("After each build step, Commander reviews, tests, and iterates.") + "\n");
    process.stdout.write("  " + tui.dimText("Writes status to ~/.claude/commander/yolo-status.txt every cycle.") + "\n\n");

    if (process.env.CCC_DISABLE_SKIP_PERMISSIONS === '1') {
      process.stdout.write('  \x1b[38;5;208mYOLO mode is disabled (CCC_DISABLE_SKIP_PERMISSIONS=1).\x1b[0m\n');
      process.stdout.write('  Unset that env var to enable YOLO mode.\n\n');
      return { next: 'main-menu' };
    }

    process.stdout.write('  \x1b[38;5;208m\u26a0\ufe0f  YOLO mode uses --dangerously-skip-permissions\x1b[0m\n');
    process.stdout.write('  This gives Claude full filesystem and shell access.\n\n');
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    var yoloConfirm = await this.ask('  Type "yes" to proceed: ');
    if (yoloConfirm.trim().toLowerCase() !== 'yes') {
      process.stdout.write('\n  Cancelled.\n');
      return { next: 'main-menu' };
    }
    process.stdout.write('\n');

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
    var stopPath = require('path').join(require('os').homedir(), '.claude', 'commander', 'yolo-stop');
    for (var cycle = 1; cycle <= maxCycles; cycle++) {
      // Check for stop signal between cycles
      try { if (require('fs').existsSync(stopPath)) { require('fs').unlinkSync(stopPath); process.stdout.write('\n  ' + tui.colorText('YOLO stopped by user (yolo-stop file detected)', tui.getTheme().accent) + '\n'); break; } } catch(_) {}
      var sp = tui.spinner("Cycle " + cycle + "/" + maxCycles + ": " + (cycle === 1 ? "Building" : "Improving") + "...");
      sp.start();
      var session = state.createSession({ task: "YOLO cycle " + cycle + ": " + task, project: null });

      // Sync to Linear — capture issue
      try {
        var yoloLinear = require("./integrations/linear");
        var yoloIssue = await yoloLinear.syncSession(session, "started");
        if (yoloIssue && yoloIssue.id) state.updateSession(session.id, { linearIssueId: yoloIssue.id, linearIssueIdentifier: yoloIssue.identifier || null });
      } catch(_e) { try { require('./error-logger').log(_e, 'yolo-linear-start'); } catch(_) {} }

      var prompt = cycle === 1 ? task : "Review and improve the previous work on: " + task + ". Fix any issues. Add missing tests. Improve quality.";
      var knowledgePrompt = knowledge.buildKnowledgePrompt(task);
      try {
        fs.writeFileSync(statusPath, "YOLO Loop: cycle " + cycle + "/" + maxCycles + " | " + new Date().toISOString() + " | Task: " + task);
        tmuxStatus("YOLO Cycle " + cycle + "/" + maxCycles + " started");
        sp.stop(true);
        process.stdout.write("\x0a" + tui.divider("YOLO Cycle " + cycle + "/" + maxCycles + (cycle === 1 ? " \u2014 Building" : " \u2014 Improving")) + "\x0a\x0a");
        process.stdout.write("  " + tui.dimText("Live output below. Watch file: ~/.claude/commander/yolo-status.txt") + "\x0a\x0a");
        var result = await d.dispatch(prompt, { stream: true, maxTurns: Math.round(100 / maxCycles), effort: cycle === 1 ? "high" : "medium", model: "opus", maxBudgetUsd: Math.round(10 / maxCycles), permissionMode: "plan", fallbackModel: "sonnet", bare: false, skipPermissions: true, name: d.generateSessionName("yolo-" + cycle + "-" + task), systemPrompt: "YOLO Loop cycle " + cycle + "/" + maxCycles + ". " + (cycle === 1 ? "Build from scratch." : "Review previous work. Fix issues. Add tests. Ship quality.") + knowledgePrompt });
        state.updateSession(session.id, { claudeSessionId: result.session_id || null, cost: result.cost_usd || 0 });
        state.completeSession(session.id, "success");
        knowledge.extractAndStore(state.getSession(session.id) || session, result.result || "");
        try { var yoloDone = require("./integrations/linear"); var yoloDoneSession = state.getSession(session.id); if (yoloDoneSession) yoloDone.syncSession(yoloDoneSession, "success").catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'yolo-linear-done'); } catch(_) {} }
        process.stdout.write("  " + tui.colorText("Cycle " + cycle + " complete", tui.getTheme().success) + "\n");
        tmuxStatus("Cycle " + cycle + "/" + maxCycles + " DONE \u2714");
      } catch (err) {
        sp.stop(false);
        try { var yoloErr = require("./integrations/linear"); var yoloErrSession = state.getSession(session.id); if (yoloErrSession) yoloErr.syncSession(yoloErrSession, "error").catch(function(){}); } catch(_e) { try { require('./error-logger').log(_e, 'yolo-linear-error'); } catch(_) {} }
        state.completeSession(session.id, "error");
        process.stdout.write("  Cycle " + cycle + " error: " + err.message + "\n");
      }
    }
    tmuxStatus("YOLO LOOP COMPLETE \u2014 " + maxCycles + " cycles \u2714");
    try { fs.writeFileSync(statusPath, "YOLO Loop COMPLETE | " + new Date().toISOString() + " | " + maxCycles + " cycles | Task: " + task); } catch(_e) {}
    process.stdout.write(tui.celebrate("YOLO LOOP COMPLETE — " + maxCycles + " cycles"));
    if (!this.rl) this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await this.ask("\n  Press Enter...");
    return { next: "main-menu" };
  }

  async quit() {
    process.stdout.write('\n  ' + tui.colorText(S.BAR_END + '  Session complete. See you next time!', tui.getTheme().dim) + '\n\n');
    this.running = false;
    if (this.rl) this.rl.close();
  }

  ask(prompt) { var self = this; if (!self.rl) { var rl2 = require('readline'); self.rl = rl2.createInterface({ input: process.stdin, output: process.stdout }); } return new Promise(function(resolve) { self.rl.question(prompt, function(answer) { resolve(answer); }); }); }
  pause(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }
}

module.exports = KitCommander;
