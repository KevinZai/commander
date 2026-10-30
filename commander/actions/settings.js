'use strict';

// Settings action handlers

module.exports = {

  async settings_name(engine, tui, _state, _choice) {
    try {
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      var newName = await engine.ask('  New name: ');
      if (newName.trim()) {
        var stateModule = require('../state');
        stateModule.updateUser({ name: newName.trim() });
        process.stdout.write(tui.celebrate('Name updated!'));
      }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'settings_name'); } catch(_) {}
    }
    return { next: 'settings' };
  },

  async settings_level(engine, tui, _state, _choice) {
    try {
      var lvlIdx = await tui.select([{label:'Guided'},{label:'Assisted'},{label:'Power'}], 'Experience level:');
      var lvls = ['guided','assisted','power'];
      if (lvlIdx >= 0) {
        var stateModule = require('../state');
        stateModule.updateUser({ level: lvls[lvlIdx] });
        var d = require('../dispatcher').getDefaultsForLevel(lvls[lvlIdx]);
        process.stdout.write(tui.celebrate('Level: ' + lvls[lvlIdx].toUpperCase()));
        process.stdout.write('\x0a  ' + tui.dimText('Model: ' + d.model + ' | Budget: $' + d.maxBudgetUsd + ' | Turns: ' + d.maxTurns + ' | Effort: ' + d.effort) + '\x0a');
      }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'settings_level'); } catch(_) {}
    }
    return { next: 'settings' };
  },

  async settings_launch_mode(_engine, _tui, _state, _choice) {
    process.stdout.write('\x0a  Use "ccc --split" to launch in tmux tab mode.\x0a');
    return { next: 'settings' };
  },

  async settings_cost(engine, tui, _state, _choice) {
    try {
      var costIdx = await tui.select([{label:'$2 (conservative)'},{label:'$5 (standard)'},{label:'$10 (aggressive)'},{label:'No limit'}], 'Max cost per dispatch:');
      var costs = [2, 5, 10, 999];
      if (costIdx >= 0) {
        var stateModule = require('../state');
        stateModule.updateState({ maxBudget: costs[costIdx] });
        process.stdout.write(tui.celebrate('Budget: $' + costs[costIdx]));
      }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'settings_cost'); } catch(_) {}
    }
    return { next: 'settings' };
  },

  async settings_animations(engine, _tui, _state, _choice) {
    try {
      var current = (process.env.CC_NO_ANIMATION || process.env.KC_NO_ANIMATION) === '1' ? 'OFF' : 'ON';
      process.stdout.write('\n  Animations are currently ' + current + '\n');
      process.stdout.write('  Set CC_NO_ANIMATION=1 in your shell to disable.\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'settings_animations'); } catch(_) {}
    }
    return { next: 'settings' };
  },

  async settings_reset(engine, tui, _state, _choice) {
    try {
      var confirmIdx = await tui.select([{label:'Yes, reset everything'},{label:'No, keep my data'}], 'Are you sure?');
      if (confirmIdx === 0) {
        var stateModule = require('../state');
        var defState = { version: 1, user: { name: null, level: 'guided', sessionsCompleted: 0 }, activeSession: null, profiles: {}, firstRun: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        stateModule.saveState(defState);
        process.stdout.write(tui.celebrate('State reset!'));
        return { next: 'main-menu' };
      }
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'settings_reset'); } catch(_) {}
    }
    return { next: 'settings' };
  },

  async change_theme(engine, _tui, _state, _choice) {
    try { return await engine.changeTheme(); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'change_theme'); } catch(_) {} return { next: 'main-menu' }; }
  },

};
