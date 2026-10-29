'use strict';

// Ingestion inbox (review queue) action handlers

function ask(engine, prompt) {
  if (!engine.rl) { var readline = require('readline'); engine.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
  return engine.ask(prompt);
}

module.exports = {

  async show_review_inbox(engine, tui, _state, _choice) {
    try {
      var inbox = require('../ingestion/inbox');
      var status = inbox.inboxStatus();
      var pending = inbox.listPending();
      process.stdout.write('\n' + tui.divider('Review Inbox') + '\n');
      if (status.warning) process.stdout.write('  Warning: ' + inbox.displayText(status.warning, 200) + '\n');
      if (pending.length === 0) {
        process.stdout.write('  Nothing pending. The weekly discovery scan fills this queue.\n');
        await ask(engine, '\n  Press Enter...');
        return { next: 'main-menu' };
      }
      process.stdout.write('  ' + pending.length + ' package' + (pending.length === 1 ? '' : 's') + ' pending\n\n');
      pending.slice(0, 15).forEach(function(i) {
        process.stdout.write('    ' + tui.dimText(String(Number(i.stars) || 0) + '*') + ' ' + inbox.displayText(i.name, 60) + '  ' + tui.dimText(inbox.displayText(i.description, 50)) + '\n');
      });
    } catch (_e) {
      try { require('../error-logger').log(_e, 'show_review_inbox'); } catch (_) {}
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
      return { next: 'main-menu' };
    }
    return { next: 'review-inbox' };
  },

  async inbox_review_package(engine, tui, _state, _choice) {
    var inbox = require('../ingestion/inbox');
    try {
      // The engine clears the screen after the adventure's top-level action, so the warning is shown here too.
      var status = inbox.inboxStatus();
      if (status.warning) process.stdout.write('\n  Warning: ' + inbox.displayText(status.warning, 200) + '\n');
      var pending = inbox.listPending();
      if (pending.length === 0) { process.stdout.write('\n  Nothing pending.\n'); return { next: 'main-menu' }; }
      var idx = await tui.select(pending.map(function(i) { return { label: inbox.displayText(i.name, 60) + (i.partial ? ' (retry)' : ''), description: (Number(i.stars) || 0) + '* ' + inbox.displayText(i.description, 60) }; }), 'Pick a package to review:');
      if (idx < 0) return { next: 'review-inbox' };
      var item = pending[idx];
      process.stdout.write('\n  Evaluating ' + inbox.displayText(item.name, 60) + '...\n');
      var ev = require('../ingestion/evaluator').evaluatePackage(item.url);
      process.stdout.write('  License: ' + (ev.license || 'unknown') + ' (' + ev.licenseRisk + ')\n');
      process.stdout.write('  Recommendation: ' + ev.recommendation + ' - ' + ev.reason + '\n');
      if (ev.overlap.length) process.stdout.write('  Overlaps: ' + ev.overlap.join(', ') + '\n');
      var answer = (await ask(engine, '\n  [a]ccept, [r]eject, or Enter to skip: ')).trim().toLowerCase();
      if (answer === 'a') {
        var res = inbox.accept(item.url);
        if (!res.ok) process.stdout.write('\n  Not accepted: ' + inbox.displayText(res.error, 200) + '\n');
        else {
          process.stdout.write('\n  ' + (res.partial ? 'Partly accepted' : 'Accepted') + '. ' + Object.keys(res.updated).map(function(k) { return k + ': ' + res.updated[k]; }).join(', ') + '\n');
          if (res.partial) process.stdout.write('  It stays in the inbox: fix the failed file, then review it again to retry.\n');
        }
        await engine.pause(1200);
      } else if (answer === 'r') {
        var rej = inbox.reject(item.url, ev.reason);
        process.stdout.write(rej.ok ? '\n  Rejected.\n' : '\n  Not rejected: ' + inbox.displayText(rej.error, 200) + '\n');
        await engine.pause(800);
      }
    } catch (_e) {
      try { require('../error-logger').log(_e, 'inbox_review_package'); } catch (_) {}
      process.stdout.write('\n  Error: ' + (_e.message || _e) + '\n');
    }
    return { next: inbox.pendingCount() > 0 ? 'review-inbox' : 'main-menu' };
  },
};
