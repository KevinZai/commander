#!/usr/bin/env node
'use strict';
var path = require('path');
var fs = require('fs');
var args = process.argv.slice(2);
var dispatching = false;
function _fatalHandler(err) {
  var msg = (err && err.message) ? err.message : String(err);
  var errId = '';
  try { errId = require(require('path').join(__dirname, '..', 'commander', 'error-logger')).logError(err, 'uncaught'); } catch (_e) {}
  process.stdout.write('\n  \u274C CC Commander hit an unexpected error: ' + msg + '\n');
  if (errId) process.stdout.write('  \uD83D\uDCCB Error ID: ' + errId + '\n');
  process.stdout.write('  \uD83D\uDCCB Report this at: https://github.com/KevinZai/commander/issues\n\n');
  process.exit(1);
}
process.on('uncaughtException', _fatalHandler);
process.on('unhandledRejection', function(reason) { _fatalHandler(reason instanceof Error ? reason : new Error(String(reason))); });


if (args.includes('--help') || args.includes('-h')) {
  console.log('\n  CC Commander — 450+ skills. One command. Your AI work, managed by AI.\n');
  console.log('  Usage:  ccc                (or: npx cc-commander)\n');
  console.log('  --version    Show version');
  console.log('  --test       Validate all modules');
  console.log('  --stats      Quick stats');
  console.log('  --repair     Fix corrupt state');
  console.log('  --simple     Menu-only mode (no tmux split)');
  console.log('  --update     Pull latest + reinstall');
  console.log('  --dispatch   Headless: ccc --dispatch "task" [--json --model X --max-turns N --budget N --cwd PATH]');
  console.log('  --list-skills  List all skills (add --json for JSON)');
  console.log('  --skills       Manage installed skills (list, available, install, remove, tier)');
  console.log('  --list-sessions  Session history (add --json for JSON)');
  console.log('  --status     Health check (JSON: version, skills, vendors)');
  console.log('  --template   Print the latest CLAUDE.md template (pipe to file)');
  console.log('  --daemon     Start persistent background daemon');
  console.log('  --queue "task"  Add task to daemon queue');
  console.log('  --queue-list Show pending daemon tasks');
  console.log('  --daemon-stop  Stop running daemon');
  console.log('  --ingest <url> Evaluate a GitHub repo for inclusion as vendor package');
  console.log('  --help       This help\n');
  process.exit(0);
}
if (args.includes('--version')) { var B = require(path.join(__dirname,'..','commander','branding')); console.log(B.product + ' v' + B.version); process.exit(0); }
if (args.includes('--simple')) { /* handled below — skip split, go to engine */ }
if (args.includes('--update')) {
  var { execSync } = require('child_process');
  var repoDir = path.resolve(__dirname, '..');
  var gitDir = path.join(repoDir, '.git');
  console.log('\n  CC Commander — Update\n');
  if (!fs.existsSync(gitDir)) {
    console.log('  Updating via npm...');
    try {
      execSync('npm update -g cc-commander', { stdio: 'inherit' });
      console.log('\n  Updated via npm.\n');
    } catch (e) {
      console.error('  npm update failed: ' + e.message);
      console.log('  Try: npm install -g cc-commander@latest\n');
    }
    process.exit(0);
  }
  console.log('  Source: ' + repoDir);
  try {
    console.log('  Pulling latest...');
    execSync('git -C ' + JSON.stringify(repoDir) + ' pull --recurse-submodules', { stdio: 'inherit' });
    console.log('  Reinstalling...');
    execSync('bash ' + JSON.stringify(path.join(repoDir, 'install.sh')) + ' --force', { stdio: 'inherit' });
    console.log('\n  CC Commander updated.\n');
  } catch (e) {
    console.error('  Update failed: ' + e.message + '\n');
    process.exit(1);
  }
  process.exit(0);
}
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
    ['evaluator', function(){ var m=require(path.join(__dirname,'..','commander','ingestion','evaluator')); if(typeof m.evaluatePackage!=='function') throw new Error('missing'); }],
  ];
  var passed = 0;
  for (var c of checks) { try { c[1](); console.log('  v ' + c[0]); passed++; } catch(e) { console.log('  x ' + c[0] + ': ' + e.message); } }
  console.log('\n  ' + passed + '/' + checks.length + ' passed');
  process.exit(passed === checks.length ? 0 : 1);
}
// Agent API: --status
if (args.includes('--status')) {
  var sb = require(path.join(__dirname,'..','commander','skill-browser'));
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
// Agent API: --skills
if (args.includes('--skills')) {
  var os = require('os');
  var skillsInstallDir = path.join(os.homedir(), '.claude', 'skills');
  var skillsSourceDir = path.join(__dirname, '..', 'skills');
  var tiersFilePath = path.join(skillsSourceDir, '_tiers.json');
  var tiers = {};
  try { tiers = JSON.parse(fs.readFileSync(tiersFilePath, 'utf8')); } catch (_e) {}

  function resolveSkills(tiersObj, tierName) {
    var tier = tiersObj.tiers && tiersObj.tiers[tierName];
    if (!tier) return [];
    var resolved = (tier.skills || []).slice();
    (tier.includes || []).forEach(function(inc) {
      resolved = resolved.concat(resolveSkills(tiersObj, inc));
    });
    return resolved.filter(function(s, i, a) { return a.indexOf(s) === i; });
  }

  function getInstalledSkills() {
    try {
      return fs.readdirSync(skillsInstallDir).filter(function(name) {
        try {
          var stat = fs.lstatSync(path.join(skillsInstallDir, name));
          return stat.isSymbolicLink() || stat.isDirectory();
        } catch (_e) { return false; }
      });
    } catch (_e) { return []; }
  }

  function getAllAvailableSkills() {
    try {
      return fs.readdirSync(skillsSourceDir).filter(function(name) {
        if (name.startsWith('_') || name.startsWith('.')) return false;
        try {
          return fs.statSync(path.join(skillsSourceDir, name)).isDirectory();
        } catch (_e) { return false; }
      });
    } catch (_e) { return []; }
  }

  var skillsIdx = args.indexOf('--skills');
  var subCmd = args[skillsIdx + 1] || '';
  // Skip sub-command args that start with '--' (treat as missing sub-command)
  if (subCmd.startsWith('--')) subCmd = '';

  if (!subCmd) {
    var B2 = require(path.join(__dirname, '..', 'commander', 'branding'));
    var installed = getInstalledSkills();
    var allAvailable = getAllAvailableSkills();
    var tierNames = tiers.tiers ? Object.keys(tiers.tiers) : [];
    console.log('\nCC Commander Skills (v' + B2.version + ')');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Installed: ' + installed.length + ' skills (manage with subcommands below)');
    console.log('Available: ' + allAvailable.length + ' total across all tiers\n');
    if (tierNames.length > 0) {
      console.log('Tiers:');
      tierNames.forEach(function(name) {
        var t = tiers.tiers[name];
        var count = name === 'full' ? allAvailable.length : resolveSkills(tiers, name).length;
        var padName = name.padEnd(14);
        console.log('  ' + padName + count + ' skills   ' + (t.description || ''));
      });
    }
    console.log('\nManage:');
    console.log('  ccc --skills list              List installed skills');
    console.log('  ccc --skills available         List skills NOT installed');
    console.log('  ccc --skills install <name>    Add a skill symlink');
    console.log('  ccc --skills remove <name>     Remove a skill symlink');
    console.log('  ccc --skills tier <tier>       Switch to a different tier');
    console.log('');
    process.exit(0);
  }

  if (subCmd === 'list') {
    var installedList = getInstalledSkills();
    if (installedList.length === 0) {
      console.log('No skills installed in ' + skillsInstallDir);
    } else {
      console.log('\nInstalled skills (' + installedList.length + '):');
      installedList.sort().forEach(function(s) { console.log('  ' + s); });
      console.log('');
    }
    process.exit(0);
  }

  if (subCmd === 'available') {
    var installedSet = getInstalledSkills();
    var allSkills = getAllAvailableSkills();
    var notInstalled = allSkills.filter(function(s) { return installedSet.indexOf(s) === -1; });
    if (notInstalled.length === 0) {
      console.log('All available skills are already installed.');
    } else {
      console.log('\nAvailable but not installed (' + notInstalled.length + '):');
      notInstalled.sort().forEach(function(s) { console.log('  ' + s); });
      console.log('');
    }
    process.exit(0);
  }

  if (subCmd === 'install') {
    var installName = args[skillsIdx + 2];
    if (!installName || installName.startsWith('--')) {
      console.error('Usage: ccc --skills install <name>');
      process.exit(1);
    }
    var installSrc = path.join(skillsSourceDir, installName);
    var installDst = path.join(skillsInstallDir, installName);
    if (!fs.existsSync(installSrc)) {
      console.error('Skill not found: ' + installName);
      process.exit(1);
    }
    if (fs.existsSync(installDst)) {
      console.log('Already installed: ' + installName);
      process.exit(0);
    }
    try {
      if (!fs.existsSync(skillsInstallDir)) fs.mkdirSync(skillsInstallDir, { recursive: true });
      fs.symlinkSync(installSrc, installDst);
      console.log('Installed: ' + installName);
    } catch (e) {
      console.error('Failed to install ' + installName + ': ' + e.message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (subCmd === 'remove') {
    var removeName = args[skillsIdx + 2];
    if (!removeName || removeName.startsWith('--')) {
      console.error('Usage: ccc --skills remove <name>');
      process.exit(1);
    }
    var removeDst = path.join(skillsInstallDir, removeName);
    if (!fs.existsSync(removeDst) && !fs.existsSync(removeDst + '/')) {
      // lstat to catch broken symlinks too
      var removExists = false;
      try { fs.lstatSync(removeDst); removExists = true; } catch (_e) {}
      if (!removExists) { console.log('Not installed: ' + removeName); process.exit(0); }
    }
    try {
      var removeStat = fs.lstatSync(removeDst);
      if (removeStat.isSymbolicLink()) {
        fs.unlinkSync(removeDst);
      } else {
        console.error(removeName + ' is not a symlink — refusing to remove. Delete manually if intended.');
        process.exit(1);
      }
      console.log('Removed: ' + removeName);
    } catch (e) {
      console.error('Failed to remove ' + removeName + ': ' + e.message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (subCmd === 'tier') {
    var tierName = args[skillsIdx + 2];
    if (!tierName || tierName.startsWith('--')) {
      console.error('Usage: ccc --skills tier <tier>');
      if (tiers.tiers) console.error('Available tiers: ' + Object.keys(tiers.tiers).join(', '));
      process.exit(1);
    }
    var tierSkills;
    if (tierName === 'full') {
      tierSkills = getAllAvailableSkills();
    } else {
      tierSkills = resolveSkills(tiers, tierName);
    }
    if (!tiers.tiers || !tiers.tiers[tierName]) {
      console.error('Unknown tier: ' + tierName);
      if (tiers.tiers) console.error('Available tiers: ' + Object.keys(tiers.tiers).join(', '));
      process.exit(1);
    }
    // Remove existing skill symlinks
    var currentInstalled = getInstalledSkills();
    var removed = 0;
    currentInstalled.forEach(function(s) {
      var dst = path.join(skillsInstallDir, s);
      try {
        var st = fs.lstatSync(dst);
        if (st.isSymbolicLink()) { fs.unlinkSync(dst); removed++; }
      } catch (_e) {}
    });
    // Install tier skills
    if (!fs.existsSync(skillsInstallDir)) fs.mkdirSync(skillsInstallDir, { recursive: true });
    var added = 0;
    var skipped = 0;
    tierSkills.forEach(function(s) {
      var src = path.join(skillsSourceDir, s);
      var dst = path.join(skillsInstallDir, s);
      if (!fs.existsSync(src)) { skipped++; return; }
      try { fs.symlinkSync(src, dst); added++; } catch (_e) { skipped++; }
    });
    console.log('Switched to tier: ' + tierName);
    console.log('  Removed: ' + removed + ' skill(s)');
    console.log('  Installed: ' + added + ' skill(s)' + (skipped > 0 ? ' (' + skipped + ' skipped/missing)' : ''));
    process.exit(0);
  }

  console.error('Unknown subcommand: ' + subCmd);
  console.error('Usage: ccc --skills [list|available|install <name>|remove <name>|tier <tier>]');
  process.exit(1);
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
// Agent API: --ingest <url>
if (args.includes('--ingest')) {
  var ingestUrl = args[args.indexOf('--ingest') + 1];
  if (!ingestUrl || ingestUrl.startsWith('--')) { console.error('Usage: ccc --ingest <github-url>'); process.exit(1); }
  var evaluator = require(path.join(__dirname, '..', 'commander', 'ingestion', 'evaluator'));
  var result = evaluator.evaluatePackage(ingestUrl);
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    var icon = result.recommendation === 'ADOPT' ? '✅' : result.recommendation === 'REFERENCE' ? '🔶' : '❌';
    console.log('\n  ' + icon + ' ' + result.recommendation + ': ' + (result.name || ingestUrl));
    console.log('  ' + (result.description || 'No description'));
    console.log('  Stars: ' + result.stars + ' | License: ' + (result.license || '?') + ' (' + result.licenseRisk + ')');
    if (result.overlap.length > 0) console.log('  Overlap: ' + result.overlap.join(', '));
    console.log('  Reason: ' + result.reason + '\n');
  }
  process.exit(0);
}
// Agent API: --dispatch "task"
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
