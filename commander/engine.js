'use strict';

const readline = require('readline');
const { loadAdventure, prepareAdventure, matchChoice } = require('./adventure');
const { renderHeader, renderAdventure, renderChecklist, renderStatsCard, renderCelebration, renderFooter, renderFreeformPrompt, renderSessionSummary, clearScreen } = require('./renderer');
const state = require('./state');
const BRAND = require('./branding');

// Lazy-load dispatcher (not needed until dispatch action)
let dispatcher = null;
function getDispatcher() {
  if (!dispatcher) dispatcher = require('./dispatcher');
  return dispatcher;
}

// Lazy-load kit-stats
let kitStats = null;
function getStats() {
  if (!kitStats) {
    try {
      kitStats = require('../lib/kit-stats');
    } catch {
      kitStats = { getStats: () => ({}), getStreak: () => ({ current: 0 }), getAchievements: () => [] };
    }
  }
  return kitStats;
}

class KitCommander {
  constructor() {
    this.rl = null;
    this.running = false;
    this.currentAdventure = null;
  }

  /**
   * Start the Kit Commander interactive loop.
   */
  async start() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.running = true;
    const currentState = state.loadState();

    // First-run onboarding
    if (currentState.firstRun) {
      await this.onboard();
    }

    // Main loop
    await this.runAdventure('main-menu');
  }

  /**
   * First-time user onboarding.
   */
  async onboard() {
    clearScreen();
    process.stdout.write(renderHeader());
    process.stdout.write(`\n  ${BRAND.welcomeNew}\n\n`);

    const name = await this.ask('  What\'s your name? ');
    state.updateUser({ name: name.trim() || 'Friend' });

    process.stdout.write(`\n  Nice to meet you, ${name.trim() || 'Friend'}! What's your experience level?\n\n`);
    process.stdout.write('    a) I\'m brand new to coding and AI tools\n');
    process.stdout.write('    b) I\'ve used some AI tools but I\'m not a developer\n');
    process.stdout.write('    c) I\'m a developer looking for a guided workflow\n');
    process.stdout.write('    d) I\'m a power user — skip the tutorial\n\n');

    const level = await this.ask('  > ');
    const levelMap = { a: 'guided', b: 'guided', c: 'assisted', d: 'power' };
    state.updateUser({ level: levelMap[level.trim().toLowerCase()] || 'guided' });
    state.updateState({ firstRun: false });

    process.stdout.write(`\n  Perfect! Let's get started.\n`);
    await this.pause(1000);
  }

  /**
   * Run an adventure by ID.
   * @param {string} adventureId
   */
  async runAdventure(adventureId) {
    while (this.running) {
      const adventure = loadAdventure(adventureId);
      if (!adventure) {
        process.stdout.write(`\n  Adventure "${adventureId}" not found. Returning to main menu.\n`);
        adventureId = 'main-menu';
        continue;
      }

      const currentState = state.loadState();
      const stats = getStats().getStats ? getStats().getStats() : {};
      const prepared = prepareAdventure(adventure, currentState, stats);

      // Handle pre-action (e.g., show_stats before choices)
      if (prepared.action) {
        await this.executeAction(prepared.action, currentState);
      }

      // Use afterAction choices if present, otherwise main choices
      const activeChoices = prepared.afterAction ? prepared.afterAction.choices : prepared.choices;
      const activePrompt = prepared.afterAction ? prepared.afterAction.prompt : prepared.prompt;

      clearScreen();
      process.stdout.write(renderHeader());

      // Render main adventure screen
      const screenToRender = prepared.afterAction
        ? { ...prepared, choices: activeChoices, prompt: activePrompt }
        : prepared;
      process.stdout.write(renderAdventure(screenToRender));

      // Get user input
      const input = await this.ask('  > ');
      const choice = matchChoice(activeChoices || [], input);

      if (!choice) {
        process.stdout.write('\n  Invalid choice. Try again.\n');
        await this.pause(800);
        continue;
      }

      // Handle the choice
      if (choice.action === 'quit') {
        await this.quit();
        return;
      }

      if (choice.action) {
        const result = await this.executeAction(choice.action, currentState, choice);

        // If action returns a next adventure, navigate there
        if (result && result.next) {
          adventureId = result.next;
          continue;
        }

        // If action has sub-adventures (like build-something)
        if (adventure.subAdventures && adventure.subAdventures[choice.next || choice.key]) {
          const sub = adventure.subAdventures[choice.next || choice.key];
          if (sub.action === 'freeform_build') {
            process.stdout.write(renderFreeformPrompt(sub.prompt));
            const description = await this.ask('  > ');
            const fullTask = (sub.context || '') + description;
            await this.executeBuild(fullTask);
            adventureId = 'main-menu';
            continue;
          }
        }

        // Default: return to main menu after action
        adventureId = 'main-menu';
        continue;
      }

      if (choice.next) {
        // Check for sub-adventures
        if (adventure.subAdventures && adventure.subAdventures[choice.next]) {
          const sub = adventure.subAdventures[choice.next];
          process.stdout.write(renderFreeformPrompt(sub.prompt));
          const description = await this.ask('  > ');
          if (sub.action === 'freeform_build') {
            const fullTask = (sub.context || '') + description;
            await this.executeBuild(fullTask);
            adventureId = 'main-menu';
            continue;
          }
        }
        adventureId = choice.next;
        continue;
      }

      // Fallback: stay on current adventure
    }
  }

  /**
   * Execute a named action.
   * @param {string} actionName
   * @param {object} currentState
   * @param {object} choice - The choice that triggered this action
   * @returns {object|null} Result with optional .next property
   */
  async executeAction(actionName, currentState, choice = {}) {
    switch (actionName) {
      case 'freeform_build': {
        process.stdout.write(renderFreeformPrompt('Tell me what you want to build (one sentence):'));
        const description = await this.ask('  > ');
        await this.executeBuild(description);
        return { next: 'main-menu' };
      }

      case 'resume_session': {
        const active = state.getActiveSession();
        if (!active) {
          process.stdout.write('\n  No active session found.\n');
          await this.pause(1500);
          return { next: 'main-menu' };
        }
        process.stdout.write(`\n  Resuming: ${active.task}\n`);
        await this.resumeSession(active);
        return { next: 'main-menu' };
      }

      case 'show_session_summary': {
        const active = state.getActiveSession();
        if (active) {
          process.stdout.write('\n' + renderSessionSummary(active) + '\n');
        } else {
          process.stdout.write('\n  No active session.\n');
        }
        await this.ask('\n  Press Enter to continue...');
        return null;
      }

      case 'resume_with_summary': {
        const active = state.getActiveSession();
        if (active) {
          process.stdout.write(`\n  Starting fresh with context from: ${active.task}\n`);
          state.completeSession(active.id, 'restarted');
          await this.executeBuild(`Continue this project: ${active.task}. Previous session context: started ${active.startTime}.`);
        }
        return { next: 'main-menu' };
      }

      case 'show_stats': {
        const stats = getStats().getStats ? getStats().getStats() : {};
        const streak = getStats().getStreak ? getStats().getStreak() : { current: 0 };
        const achievements = getStats().getAchievements ? getStats().getAchievements() : [];
        process.stdout.write(renderStatsCard({
          sessions: stats.totalSessions || currentState.user?.sessionsCompleted || 0,
          streak: streak.current || 0,
          achievements: achievements.length,
          cost: stats.totalCost || 0,
        }));
        return null;
      }

      case 'show_achievements': {
        const achievements = getStats().getAchievements ? getStats().getAchievements() : [];
        if (achievements.length === 0) {
          process.stdout.write('\n  No achievements unlocked yet. Keep building!\n');
        } else {
          process.stdout.write('\n  🏆 Your Achievements:\n');
          for (const a of achievements) {
            process.stdout.write(`  ✓ ${a}\n`);
          }
        }
        process.stdout.write('\n');
        await this.ask('  Press Enter to continue...');
        return { next: 'check-stats' };
      }

      case 'show_history': {
        const sessions = state.listSessions(5);
        if (sessions.length === 0) {
          process.stdout.write('\n  No session history yet.\n');
        } else {
          process.stdout.write('\n  Recent Sessions:\n\n');
          for (const s of sessions) {
            process.stdout.write(renderSessionSummary(s) + '\n\n');
          }
        }
        await this.ask('  Press Enter to continue...');
        return { next: 'check-stats' };
      }

      case 'show_recent_sessions': {
        const sessions = state.listSessions(5);
        if (sessions.length === 0) {
          process.stdout.write('\n  No sessions yet. Build something to get started!\n');
        } else {
          process.stdout.write('\n  Recent Sessions:\n\n');
          for (const s of sessions) {
            process.stdout.write(renderSessionSummary(s) + '\n\n');
          }
        }
        return null;
      }

      case 'browse_skills':
      case 'browse_mega_skills':
      case 'show_cheatsheet':
      case 'recommend_skill':
      case 'pick_session_to_resume':
      case 'pick_session_details':
        process.stdout.write(`\n  ${actionName} — coming in the next update!\n`);
        await this.pause(1500);
        return { next: 'main-menu' };

      default:
        process.stdout.write(`\n  Unknown action: ${actionName}\n`);
        await this.pause(1000);
        return null;
    }
  }

  /**
   * Execute a build task via the dispatcher.
   * @param {string} task - Plain English task description
   */
  async executeBuild(task) {
    const session = state.createSession({ task, project: null });

    process.stdout.write(`\n  Got it! Here's what I'll do:\n`);

    // Show a planning checklist
    const steps = [
      { text: 'Understand what you need', status: 'active' },
      { text: 'Set up the project', status: 'pending' },
      { text: 'Build the main features', status: 'pending' },
      { text: 'Review and polish', status: 'pending' },
    ];
    process.stdout.write(renderChecklist(steps));

    const confirm = await this.ask('  Ready to start? (y/n) ');
    if (confirm.trim().toLowerCase() !== 'y') {
      state.completeSession(session.id, 'cancelled');
      process.stdout.write('\n  No problem! Come back when you\'re ready.\n');
      await this.pause(1500);
      return;
    }

    // Dispatch to Claude Code
    process.stdout.write('\n  Working on it...\n');

    try {
      const d = getDispatcher();
      const result = d.dispatch(task, { sync: true, maxTurns: 30 });

      // Update session
      state.updateSession(session.id, {
        claudeSessionId: result.session_id || null,
        cost: result.cost_usd || 0,
      });
      state.completeSession(session.id, 'success');

      // Celebrate!
      steps.forEach(s => s.status = 'done');
      process.stdout.write(renderChecklist(steps));
      process.stdout.write(renderCelebration('DONE!'));

      // Show result summary
      if (result.result) {
        const summary = typeof result.result === 'string'
          ? result.result.slice(0, 500)
          : JSON.stringify(result.result).slice(0, 500);
        process.stdout.write(`\n  ${summary}\n`);
      }
    } catch (err) {
      state.completeSession(session.id, 'error');
      process.stdout.write(`\n  Something went wrong, but don't worry!\n`);
      process.stdout.write(`  Error: ${err.message}\n`);
      process.stdout.write(`  Tip: Make sure Claude Code CLI is installed (npm i -g @anthropic-ai/claude-code)\n`);
    }

    await this.ask('\n  Press Enter to continue...');
  }

  /**
   * Resume an existing session.
   * @param {object} session
   */
  async resumeSession(session) {
    process.stdout.write(`\n  Resuming session: ${session.task}\n`);
    try {
      const d = getDispatcher();
      const result = d.dispatch(`Continue working on: ${session.task}`, {
        sync: true,
        maxTurns: 30,
        resume: session.claudeSessionId || undefined,
      });

      state.updateSession(session.id, {
        cost: (session.cost || 0) + (result.cost_usd || 0),
      });

      process.stdout.write(renderCelebration('Progress made!'));
      if (result.result) {
        const summary = typeof result.result === 'string'
          ? result.result.slice(0, 500)
          : JSON.stringify(result.result).slice(0, 500);
        process.stdout.write(`\n  ${summary}\n`);
      }
    } catch (err) {
      process.stdout.write(`\n  Could not resume: ${err.message}\n`);
    }

    await this.ask('\n  Press Enter to continue...');
  }

  /**
   * Graceful quit.
   */
  async quit() {
    process.stdout.write('\n  See you next time! 👋\n');
    process.stdout.write(renderFooter());
    this.running = false;
    this.rl.close();
  }

  /**
   * Prompt user for input.
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  ask(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, answer => resolve(answer));
    });
  }

  /**
   * Pause for a duration.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = KitCommander;
