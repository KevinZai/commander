#!/usr/bin/env node
'use strict';
var path = require('path');
var args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('\n  CC Commander — 441+ skills. One command. Your AI work, managed by AI.\n');
  console.log('  Usage:  ccc                (or: npx cc-commander)\n');
  console.log('  --version    Show version');
  console.log('  --test       Validate all modules');
  console.log('  --stats      Quick stats');
  console.log('  --repair     Fix corrupt state');
  console.log('  --split      Split mode: CCC menu + Claude Code side by side (tmux)');
  console.log('  --update     Check vendor package updates');
  console.log('  --help       This help\n');
  process.exit(0);
}
if (args.includes('--version')) { var B = require(path.join(__dirname,'..','commander','branding')); console.log(B.product + ' v' + B.version); process.exit(0); }
if (args.includes('--split')) { var cp = require('child_process'); var script = path.join(__dirname, 'ccc-split.sh'); try { cp.execSync('bash ' + script, { stdio: 'inherit' }); } catch(_e) {} process.exit(0); }
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
  ];
  var passed = 0;
  for (var c of checks) { try { c[1](); console.log('  v ' + c[0]); passed++; } catch(e) { console.log('  x ' + c[0] + ': ' + e.message); } }
  console.log('\n  ' + passed + '/' + checks.length + ' passed');
  process.exit(passed === checks.length ? 0 : 1);
}
var KitCommander = require(path.join(__dirname,'..','commander','engine'));
new KitCommander().start().catch(function(err) { console.error('CC Commander error:', err.message); process.exit(1); });
