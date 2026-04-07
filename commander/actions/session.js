'use strict';

// Session-related action handlers

module.exports = {

  async resume_session(engine, tui, state, choice) {
    try {
      var active = state.getActiveSession();
      if (!active) { process.stdout.write('\n  No active session found.\n'); await engine.pause(1500); return { next: 'main-menu' }; }
      await engine.resumeSession(active);
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'resume_session'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async show_session_summary(engine, tui, state, choice) {
    try {
      var active2 = state.getActiveSession();
      if (active2) { process.stdout.write('\n' + engine.renderSession(active2) + '\n'); }
      else { process.stdout.write('\n  No active session.\n'); }
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'show_session_summary'); } catch(_) {}
    }
    return { next: 'continue-work' };
  },

  async resume_with_summary(engine, tui, state, choice) {
    try {
      var act = state.getActiveSession();
      if (act) { state.completeSession(act.id, 'restarted'); await engine.executeBuild('Continue: ' + act.task); }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'resume_with_summary'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async show_history(engine, tui, state, choice) {
    return module.exports._showHistoryImpl(engine, tui, state, choice, 'show_history');
  },

  async show_recent_sessions(engine, tui, state, choice) {
    return module.exports._showHistoryImpl(engine, tui, state, choice, 'show_recent_sessions');
  },

  async _showHistoryImpl(engine, tui, state, choice, actionName) {
    try {
      var sessions = state.listSessions(5);
      if (sessions.length === 0) { process.stdout.write('\n  No sessions yet.\n'); }
      else {
        process.stdout.write('\n' + tui.divider('Recent Sessions') + '\n\n');
        sessions.forEach(function(s) { process.stdout.write(engine.renderSession(s) + '\n\n'); });
      }
      if (actionName === 'show_recent_sessions') return { next: 'review-work' };
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, actionName); } catch(_) {}
    }
    return { next: 'check-stats' };
  },

  async pick_session_to_resume(engine, tui, state, choice) {
    try { return await engine.pickSessionToResume(); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'pick_session_to_resume'); } catch(_) {} return { next: 'main-menu' }; }
  },

  async pick_session_details(engine, tui, state, choice) {
    try { return await engine.pickSessionDetails(); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'pick_session_details'); } catch(_) {} return { next: 'main-menu' }; }
  },

};
