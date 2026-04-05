'use strict';

// Skills and learning action handlers

module.exports = {

  async browse_skills(engine, tui, state, choice) {
    try { return await engine.browseSkills(false); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'browse_skills'); } catch(_) {} return { next: 'main-menu' }; }
  },

  async browse_ccc_domains(engine, tui, state, choice) {
    return { next: 'ccc-domains' };
  },

  async show_cheatsheet(engine, tui, state, choice) {
    try { return await engine.showCheatsheet(); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'show_cheatsheet'); } catch(_) {} return { next: 'main-menu' }; }
  },

  async recommend_skill(engine, tui, state, choice) {
    try { return await engine.recommendSkill(state.loadState()); }
    catch(_e) { process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a'); try { require('../error-logger').log(_e, 'recommend_skill'); } catch(_) {} return { next: 'main-menu' }; }
  },

  async show_all_mega(engine, tui, state, choice) {
    try {
      var skillBrowserMod = require('../skill-browser');
      process.stdout.write('\n' + tui.divider('All 11 CCC Domains') + '\n\n');
      var allSkills = skillBrowserMod.listSkills();
      var megas = allSkills.filter(function(s) { return s.isMega; });
      if (megas.length === 0) { process.stdout.write('  No CCC domains found.\n'); }
      megas.forEach(function(m) {
        var subCount = 0;
        try {
          var fs = require('fs');
          var entries = fs.readdirSync(require('path').dirname(m.path), {withFileTypes:true});
          subCount = entries.filter(function(e){return e.isDirectory();}).length;
        } catch(_e2) {}
        process.stdout.write('  ' + tui.boldText(m.name, tui.getTheme().primary) + ' (' + (subCount || '?') + ' sub-skills)\n');
        process.stdout.write('  ' + tui.dimText(m.description || '') + '\n\n');
      });
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\n  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'show_all_mega'); } catch(_) {}
    }
    return { next: 'ccc-domains' };
  },

  async show_mega_detail(engine, tui, state, choice) {
    try {
      process.stdout.write('\n  ' + tui.boldText('Pick a CCC domain and describe your need.', tui.getTheme().text) + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      var megaTask = await engine.ask('  > ');
      if (megaTask.trim()) await engine.executeBuild(megaTask);
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'show_mega_detail'); } catch(_) {}
    }
    return { next: 'ccc-domains' };
  },

};
