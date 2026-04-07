'use strict';

// Stats and achievements action handlers

var kitStats = null;
function getStats() {
  if (!kitStats) {
    try { kitStats = require('../../lib/kit-stats'); }
    catch (_e) { kitStats = { getStats: function() { return {}; }, getStreak: function() { return { current: 0 }; }, getAchievements: function() { return []; } }; }
  }
  return kitStats;
}

module.exports = {

  async show_stats(engine, tui, state, choice) {
    try {
      var s = getStats().getStats ? getStats().getStats() : {};
      var streak = getStats().getStreak ? getStats().getStreak() : { current: 0 };
      var ach = getStats().getAchievements ? getStats().getAchievements() : [];
      var stateModule = require('../state');
      var currentState = stateModule.loadState();
      var dashData = {
        sessions: s.totalSessions || (currentState.user && currentState.user.sessionsCompleted) || 0,
        streak: streak.current || 0,
        longestStreak: streak.longest || 0,
        achievements: ach.length,
        cost: s.totalCost || 0,
        level: stateModule.getUserLevel(currentState),
        dailyCosts: [],
        dailySessions: [],
      };
      if (s.dailyLog) {
        var dates = Object.keys(s.dailyLog).sort().slice(-7);
        dashData.dailyCosts = dates.map(function(d) { return s.dailyLog[d].cost || 0; });
        dashData.dailySessions = dates.map(function(d) { return s.dailyLog[d].sessions || 0; });
      }
      process.stdout.write(tui.renderDashboard(dashData));
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'show_stats'); } catch(_) {}
    }
    return { next: 'check-stats' };
  },

  async show_achievements(engine, tui, state, choice) {
    var t = tui.getTheme();
    try {
      var achs = getStats().getAchievements ? getStats().getAchievements() : [];
      if (achs.length === 0) { process.stdout.write('\n  No achievements yet. Keep building!\n'); }
      else {
        process.stdout.write('\n' + tui.divider('Achievements') + '\n');
        achs.forEach(function(a) { process.stdout.write('  ' + tui.colorText('  v ', t.success) + (typeof a === 'string' ? a : a.name || String(a)) + '\n'); });
      }
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'show_achievements'); } catch(_) {}
    }
    return { next: 'check-stats' };
  },

};
