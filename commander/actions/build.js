'use strict';

// Build-related action handlers
// Each function receives (engine, tui, state, choice) and returns { next: string } or null

module.exports = {

  async freeform_build(engine, tui, state, choice) {
    try {
      process.stdout.write('\n  ' + tui.boldText('Tell me what you want to build:', tui.getTheme().text) + '\n');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      var desc = await engine.ask('  > ');
      await engine.executeBuild(desc);
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'freeform_build'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async freeform_dispatch(engine, tui, state, choice) {
    return module.exports.freeform_build(engine, tui, state, choice);
  },

  async dispatch(engine, tui, state, choice) {
    try {
      var dispatchTask = (choice && choice.description) || 'autonomous task';
      await engine.executeBuild(dispatchTask);
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'dispatch'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async freeform_prompt(engine, tui, state, choice) {
    try {
      process.stdout.write('\x0a  ' + tui.boldText('Type anything — a command, a question, or what you want to build:', tui.getTheme().text) + '\x0a');
      process.stdout.write('  ' + tui.dimText('Examples: /ccc-xray  |  build a landing page  |  /plan  |  fix the auth bug') + '\x0a');
      process.stdout.write('  ' + tui.dimText('(empty or "back" to cancel)') + '\x0a\x0a');
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      var freeInput = await engine.ask('  > ');
      if (!freeInput || !freeInput.trim() || /^(back|cancel|q|quit|exit)$/i.test(freeInput.trim())) return { next: 'main-menu' };
      await engine.executeBuild(freeInput.trim());
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'freeform_prompt'); } catch(_) {}
    }
    return { next: 'main-menu' };
  },

  async night_build(engine, tui, state, choice) {
    return engine.nightBuild();
  },

  async yolo_loop(engine, tui, state, choice) {
    return engine.yoloLoop();
  },

  async night_explain(engine, tui, state, choice) {
    try {
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
      if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
      await engine.ask('\x0a  Press Enter...');
    } catch(_e) {
      process.stdout.write('\x0a  Error: ' + (_e.message || 'Unknown error') + '\x0a');
      try { require('../error-logger').log(_e, 'night_explain'); } catch(_) {}
    }
    return { next: 'night-build' };
  },

};
