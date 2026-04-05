#!/usr/bin/env node
'use strict';
var path = require('path');
var args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('\n  CC Commander — 350+ skills. One command. Your AI work, managed by AI.\n');
  console.log('  Usage:  ccc                (or: npx cc-commander)\n');
  console.log('  --version    Show version');
  console.log('  --test       Validate all modules');
  console.log('  --stats      Quick stats');
  console.log('  --repair     Fix corrupt state');
  console.log('  --simple     Menu-only mode (no tmux)');
  console.log('  --update     Check vendor package updates');
  console.log('  --dispatch   Headless: ccc --dispatch "task" [--json --model X --max-turns N --budget N --cwd PATH]');
  console.log('  --list-skills  List all skills (add --json for JSON)');
  console.log('  --list-sessions  Session history (add --json for JSON)');
  console.log('  --status     Health check (JSON: version, skills, vendors)');
  console.log('  --template   Print the latest CLAUDE.md template (pipe to file)');
  console.log('  --daemon     Start persistent background daemon');
  console.log('  --queue "task"  Add task to daemon queue');
  console.log('  --queue-list Show pending daemon tasks');
  console.log('  --daemon-stop  Stop running daemon');
  console.log('  --help       This help\n');
  process.exit(0);
}
if (args.includes('--version')) { var B = require(path.join(__dirname,'..','commander','branding')); console.log(B.product + ' v' + B.version); process.exit(0); }
if (args.includes('--simple')) { /* handled below — skip split, go to engine */ }
if (args.includes('--repair')) { var st = require(path.join(__dirname,'..','commander','state')); console.log('CC Commander — State Repair\n'); var r = st.repairState(); console.log(r.repaired ? '  Repaired: ' + r.details.join(', ') : '  State healthy.'); process.exit(0); }
if (args.includes('--stats')) {
  var st2 = require(path.join(__dirname,'..','commander','state')); var cs = st2.loadState();
  var ks; try { ks = require(path.join(__dirname,'..','lib','kit-stats')); } catch(_e) { ks = {getStats:function(){return {};},getStreak:function(){return {current:0};},getAchievements:function(){return [];}}; }
  var s = ks.getStats(), sk = ks.getStreak(), a = ks.getAchievements();
  console.log('\n  CC Commander Stats\n');
  console.log('  Sessions:     ' + (s.totalSessions || (cs.user&&cs.user.sessionsCompleted) || 0));
  console.log('  Streak:       ' + (sk.current||0) + ' days (longest: ' + (sk.longest||0) + ')');
  console.log('  Achievements: ' + a.length);
  console.log('  Cost:         $' + (s.totalCost||0).toFixed(2));
  console.log('  Level:        ' + st2.getUserLevel(cs) + '\n');
  process.exit(0);
}
if (args.includes('--test')) {
  console.log('CC Commander self-test:\n');
  var checks = [
    ['branding', function(){ return require(path.join(__dirname,'..','commander','branding')); }],
    ['state', function(){ var m=require(path.join(__dirname,'..','commander','state')); if(typeof m.repairState!=='function') throw new Error('repairState missing'); }],
    ['adventure', function(){ var m=require(path.join(__dirname,'..','commander','adventure')); if(typeof m.resolveGitData!=='function') throw new Error('resolveGitData missing'); }],
    ['renderer', function(){ require(path.join(__dirname,'..','commander','renderer')); }],
    ['dispatcher', function(){ var m=require(path.join(__dirname,'..','commander','dispatcher')); if(typeof m.generateSessionName!=='function') throw new Error('missing'); }],
    ['tui', function(){ var m=require(path.join(__dirname,'..','commander','tui')); if(typeof m.renderLogo!=='function') throw new Error('missing'); if(typeof m.renderLogoResponsive!=='function') throw new Error('responsive missing'); if(typeof m.wipeTransition!=='function') throw new Error('wipe missing'); }],
    ['skill-browser', function(){ require(path.join(__dirname,'..','commander','skill-browser')); }],
    ['recommendations', function(){ require(path.join(__dirname,'..','commander','recommendations')); }],
    ['sync', function(){ require(path.join(__dirname,'..','commander','sync')); }],
    ['engine', function(){ require(path.join(__dirname,'..','commander','engine')); }],
    ['main-menu', function(){ require(path.join(__dirname,'..','commander','adventures','main-menu.json')); }],
    ['build-something', function(){ require(path.join(__dirname,'..','commander','adventures','build-something.json')); }],
    ['continue-work', function(){ require(path.join(__dirname,'..','commander','adventures','continue-work.json')); }],
    ['review-work', function(){ require(path.join(__dirname,'..','commander','adventures','review-work.json')); }],
    ['learn-skill', function(){ require(path.join(__dirname,'..','commander','adventures','learn-skill.json')); }],
    ['check-stats', function(){ require(path.join(__dirname,'..','commander','adventures','check-stats.json')); }],
    ['create-content', function(){ require(path.join(__dirname,'..','commander','adventures','create-content.json')); }],
    ['research', function(){ require(path.join(__dirname,'..','commander','adventures','research.json')); }],
    ['night-build', function(){ var n = require(path.join(__dirname,'..','commander','adventures','night-build.json')); if(n.version !== 2) throw new Error('not v2'); }],
    ['ccc-domains', function(){ require(path.join(__dirname,'..','commander','adventures','ccc-domains.json')); }],
    ['knowledge', function(){ var k = require(path.join(__dirname,'..','commander','knowledge')); if(typeof k.extractAndStore !== 'function') throw new Error('missing'); }],
    ['plugins', function(){ var p = require(path.join(__dirname,'..','commander','plugins')); if(typeof p.detectPlugins !== 'function') throw new Error('missing'); }],
    ['settings', function(){ require(path.join(__dirname,'..','commander','adventures','settings.json')); }],
    ['linear', function(){ require(path.join(__dirname,'..','commander','integrations','linear')); }],
    ['infrastructure', function(){ require(path.join(__dirname,'..','commander','adventures','infrastructure.json')); }],
    ['service-detector', function(){ var m=require(path.join(__dirname,'..','commander','service-detector')); if(typeof m.detectServices!=='function') throw new Error('missing'); }],
  ];
  var passed = 0;
  for (var c of checks) { try { c[1](); console.log('  v ' + c[0]); passed++; } catch(e) { console.log('  x ' + c[0] + ': ' + e.message); } }
  console.log('\n  ' + passed + '/' + checks.length + ' passed');
  process.exit(passed === checks.length ? 0 : 1);
}
// Agent API: --status
if (args.includes('--status')) {
  var sb = require(path.join(__dirname,'..','commander','skill-browser'));
  var fs = require('fs');
  var B = require(path.join(__dirname,'..','commander','branding'));
  var vc = 0; try { vc = fs.readdirSync(path.join(__dirname,'..','vendor')).length; } catch(_e) {}
  console.log(JSON.stringify({ version: B.version, skills: sb.listSkills().length, vendors: vc, health: 'ok' }));
  process.exit(0);
}
// Agent API: --list-skills
if (args.includes('--list-skills')) {
  var sb2 = require(path.join(__dirname,'..','commander','skill-browser'));
  var skills = sb2.listSkills();
  if (args.includes('--json')) console.log(JSON.stringify(skills));
  else skills.forEach(function(s) { console.log(s.name + (s.description ? ' — ' + s.description.slice(0, 80) : '')); });
  process.exit(0);
}
// Agent API: --list-sessions
if (args.includes('--list-sessions')) {
  var st3 = require(path.join(__dirname,'..','commander','state'));
  var sessions = st3.listSessions(50);
  if (args.includes('--json')) console.log(JSON.stringify(sessions));
  else sessions.forEach(function(s) { console.log((s.id||'?') + ' | ' + (s.task||'').slice(0,60) + ' | ' + (s.status||'?')); });
  process.exit(0);
}
// Agent API: --template (print template for other projects to use)
if (args.includes('--template')) {
  var fs = require('fs');
  var templatePath = path.join(__dirname, '..', 'CLAUDE.md.template');
  try {
    process.stdout.write(fs.readFileSync(templatePath, 'utf8'));
  } catch(_e) {
    console.error('Template not found at ' + templatePath);
  }
  process.exit(0);
}
// Daemon mode
if (args.includes('--daemon')) {
  dispatching = true; // prevent interactive launch
  var daemon = require(path.join(__dirname, '..', 'commander', 'daemon'));
  var running = daemon.isRunning();
  if (running) { console.log('Daemon already running (PID ' + running + '). Use --daemon-stop first.'); process.exit(1); }
  daemon.start({
    interval: args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) * 1000 : 300000,
    budget: args.includes('--tick-budget') ? parseInt(args[args.indexOf('--tick-budget') + 1]) * 1000 : 15000,
    dreamInterval: args.includes('--dream') ? parseInt(args[args.indexOf('--dream') + 1]) * 60000 : 3600000,
  });
}
if (args.includes('--daemon-stop')) {
  var daemon2 = require(path.join(__dirname, '..', 'commander', 'daemon'));
  if (daemon2.stop()) console.log('Daemon stopped.');
  else console.log('No daemon running.');
  process.exit(0);
}
if (args.includes('--queue') && !args.includes('--queue-list')) {
  var qi = args.indexOf('--queue') + 1;
  var qtask = args[qi];
  if (!qtask || qtask.startsWith('--')) { console.error('Usage: ccc --queue "task description"'); process.exit(1); }
  var qpri = args.includes('--priority') ? parseInt(args[args.indexOf('--priority') + 1]) : 3;
  var q = require(path.join(__dirname, '..', 'commander', 'queue'));
  var item = q.addTask(qtask, qpri);
  console.log('Queued: ' + item.id + ' (priority ' + item.priority + ')');
  process.exit(0);
}
if (args.includes('--queue-list')) {
  var q2 = require(path.join(__dirname, '..', 'commander', 'queue'));
  var tasks = q2.listTasks();
  if (tasks.length === 0) { console.log('Queue empty.'); }
  else { tasks.forEach(function(t) { console.log('[' + t.priority + '] ' + t.status.toUpperCase().padEnd(8) + ' ' + t.task.slice(0, 60) + ' (' + t.id + ')'); }); }
  process.exit(0);
}
// Agent API: --dispatch "task"
var dispatching = false;
if (args.includes('--dispatch')) {
  dispatching = true;
  var ti = args.indexOf('--dispatch') + 1;
  var task = args[ti];
  if (!task || task.startsWith('--')) { console.error('Usage: ccc --dispatch "task"'); process.exit(1); }
  var jm = args.includes('--json');
  var md = args.includes('--model') ? args[args.indexOf('--model') + 1] : undefined;
  var mt = args.includes('--max-turns') ? parseInt(args[args.indexOf('--max-turns') + 1]) : 30;
  var bg = args.includes('--budget') ? parseFloat(args[args.indexOf('--budget') + 1]) : undefined;
  var cw = args.includes('--cwd') ? args[args.indexOf('--cwd') + 1] : undefined;
  var d = require(path.join(__dirname,'..','commander','dispatcher'));
  var result = d.dispatch(task, { model: md, maxTurns: mt, maxBudgetUsd: bg, cwd: cw, bare: true, stream: false });
  if (result && typeof result.then === 'function') {
    result
      .then(function(r) { if (jm) console.log(JSON.stringify(r)); else console.log(r.result || 'Done'); process.exit(0); })
      .catch(function(e) { if (jm) console.log(JSON.stringify({error:e.message})); else console.error('Error: '+e.message); process.exit(1); });
  } else {
    if (jm) console.log(JSON.stringify(result)); else console.log((result && result.result) || 'Done');
    process.exit(0);
  }
}
if (!dispatching) {
  if (args.includes('--simple') || process.env.CCC_TMUX_SESSION || process.env.CCC_SIMPLE) {
    // Simple mode: menu only (also used when already inside tmux split)
    var KitCommander = require(path.join(__dirname,'..','commander','engine'));
    new KitCommander().start().catch(function(err) { console.error('CC Commander error:', err.message); process.exit(1); });
  } else {
    // Default: launch tmux split mode
    var cp2 = require('child_process');
    var splitScript = path.join(__dirname, 'ccc-split.sh');
    try {
      if (!process.stdout.isTTY) {
        // Not a terminal (piped/scripted) — fall back to simple
        var KitCommander2 = require(path.join(__dirname,'..','commander','engine'));
        new KitCommander2().start().catch(function(err) { console.error('CC Commander error:', err.message); process.exit(1); });
      } else {
        cp2.execSync('bash ' + splitScript, { stdio: 'inherit' });
      }
    } catch(_e) {
      // tmux not available — fall back to simple
      var KitCommander3 = require(path.join(__dirname,'..','commander','engine'));
      new KitCommander3().start().catch(function(err) { console.error('CC Commander error:', err.message); process.exit(1); });
    }
  }
}
