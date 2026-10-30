'use strict';
/**
 * `ccc statusline sync [--lane X] [--apply] [--json] [--home DIR]`: compare each
 * lane's live status line files with this checkout's lib/ copies.
 *
 * `claude plugin update` does not touch the status line: install.sh copies
 * lib/statusline*.sh into a config dir once, and settings.json points at that
 * copy. So lane fixes never reach running lanes. Dry run by default: it prints
 * what differs and changes nothing. --apply archives each old file to
 * <config dir>/commander/archive/<ts>/ (never deletes), then copies.
 */

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var lane = require('./lane');
var instances = require('./instances');

var SCHEMA = 1;
var FILES = ['statusline.sh', 'statusline-superfleet.sh'];

function readText(file) {
  try { return { text: fs.readFileSync(file, 'utf8') }; } catch (e) { return { error: e.code || 'EIO' }; }
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/** Lines only in a / only in b, counted as multisets: a cheap "+N/-M" summary. */
function lineDelta(live, source) {
  var counts = {};
  live.split('\n').forEach(function(l) { counts[l] = (counts[l] || 0) + 1; });
  var added = 0;
  source.split('\n').forEach(function(l) {
    if (counts[l]) counts[l]--; else added++;
  });
  var removed = Object.keys(counts).reduce(function(n, k) { return n + counts[k]; }, 0);
  return { added: added, removed: removed };
}

/** Split a command line into words, keeping quoted spans (with spaces) whole. */
function shellWords(cmd) {
  var words = [];
  var re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  var m;
  while ((m = re.exec(cmd)) !== null) words.push(m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : m[2] !== undefined ? m[2] : m[3]);
  return words;
}

/**
 * Where a lane's status line lives: the dir of the statusline.sh its
 * settings.json statusLine.command runs, else <config dir>/lib.
 * Returns {dir, from: 'settings'|'default'|'custom', error?}; 'custom' is a
 * statusLine command that runs something other than statusline.sh.
 */
function targetDir(configDir, home) {
  var file = path.join(configDir, 'settings.json');
  var raw = readText(file);
  if (raw.error && raw.error !== 'ENOENT') return { dir: path.join(configDir, 'lib'), from: 'default', error: 'settings.json unreadable (' + raw.error + ')' };
  if (raw.error) return { dir: path.join(configDir, 'lib'), from: 'default' };
  var json;
  try { json = JSON.parse(raw.text); } catch (_e) {
    return { dir: path.join(configDir, 'lib'), from: 'default', error: 'settings.json is not valid JSON' };
  }
  var cmd = json && json.statusLine && typeof json.statusLine.command === 'string' ? json.statusLine.command : '';
  if (!cmd.trim()) return { dir: path.join(configDir, 'lib'), from: 'default' };
  var word = shellWords(cmd).filter(function(w) { return path.basename(w) === 'statusline.sh'; })[0];
  var p = word ? word.replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, home) : null;
  if (!p || !path.isAbsolute(p)) return { dir: path.join(configDir, 'lib'), from: 'custom' };
  return { dir: path.dirname(p), from: 'settings' };
}

function compareFile(sourceDir, dir, name) {
  var src = readText(path.join(sourceDir, name));
  var live = readText(path.join(dir, name));
  var row = { name: name, status: null, source_sha: src.text !== undefined ? sha(src.text) : null, live_sha: null };
  if (src.error) { row.status = 'no_source'; row.error = src.error; return row; }
  if (live.error === 'ENOENT') { row.status = 'missing'; return row; }
  if (live.error) { row.status = 'unreadable'; row.error = live.error; return row; }
  row.live_sha = sha(live.text);
  if (live.text === src.text) { row.status = 'same'; return row; }
  row.status = 'differs';
  var d = lineDelta(live.text, src.text);
  row.lines_added = d.added;
  row.lines_removed = d.removed;
  return row;
}

/**
 * Build the sync plan. opts: {home, sourceDir, lane: name filter}.
 * Lanes that share one status line dir (every lane pointing at
 * ~/.claude/lib/statusline.sh) collapse into one target.
 */
function plan(opts) {
  opts = opts || {};
  var home = opts.home || process.env.HOME;
  var sourceDir = opts.sourceDir || path.resolve(__dirname, '..', '..', 'lib');
  var dirs = instances.listInstanceDirs(home);
  var lanes = dirs.map(function(configDir) {
    var info = lane.resolveLane({ HOME: home, CCC_CONFIG_DIR: configDir });
    return { name: info.lane, config_dir: configDir, dir_name: path.basename(configDir) };
  });
  if (opts.lane) {
    var want = String(opts.lane);
    lanes = lanes.filter(function(l) { return l.name === want || l.dir_name === want; });
    if (!lanes.length) {
      var err = new Error('unknown lane "' + want + '"; lanes: ' + dirs.map(function(d) { return lane.resolveLane({ HOME: home, CCC_CONFIG_DIR: d }).lane; }).join(', '));
      err.exitCode = 2;
      throw err;
    }
  }
  var byDir = {};
  var targets = [];
  lanes.forEach(function(l) {
    var t = targetDir(l.config_dir, home);
    // A custom command never shares a target: it must not mask a lane that runs the shared statusline.sh.
    var key = t.from === 'custom' ? 'custom:' + l.config_dir : t.dir;
    if (!byDir[key]) {
      byDir[key] = { dir: t.dir, from: t.from, lanes: [], archive_config_dir: null, warnings: [], files: [] };
      targets.push(byDir[key]);
    } else if (t.from === 'settings') {
      byDir[key].from = 'settings';
    }
    byDir[key].lanes.push(l.name);
    if (t.error) byDir[key].warnings.push(l.name + ': ' + t.error);
    // Archive under the config dir that owns the target, else the first lane's.
    var owns = t.dir === l.config_dir || t.dir.indexOf(l.config_dir + path.sep) === 0;
    if (owns || !byDir[key].archive_config_dir) byDir[key].archive_config_dir = l.config_dir;
  });
  targets.forEach(function(t) {
    // No statusLine command and no status line in <config dir>/lib: nothing runs there, so nothing to sync.
    // A custom statusLine command runs something else: leave it alone.
    t.configured = t.from === 'settings' || (t.from === 'default' && fs.existsSync(path.join(t.dir, 'statusline.sh')));
    t.files = t.configured ? FILES.map(function(name) { return compareFile(sourceDir, t.dir, name); }) : [];
    // An unreadable or malformed settings.json means the running command is unknown: never report it in sync.
    t.in_sync = t.warnings.length === 0 && t.files.every(function(f) { return f.status === 'same'; });
  });
  return {
    schema: SCHEMA,
    source_dir: sourceDir,
    applied: false,
    in_sync: targets.every(function(t) { return t.in_sync; }),
    targets: targets,
  };
}

function stamp(now) {
  return (now ? new Date(now) : new Date()).toISOString().replace(/[:.]/g, '-');
}

/**
 * Apply a plan: for each differing or missing file, archive the live copy
 * (when there is one) to <config dir>/commander/archive/<ts>/, then copy the
 * source in with tmp + rename. Unreadable files are left alone and reported.
 */
function apply(result, opts) {
  opts = opts || {};
  var ts = stamp(opts.now);
  result.applied = true;
  result.targets.forEach(function(t) {
    if (t.warnings.length) return; // the running status line is unknown; do not guess where to copy
    t.files.forEach(function(f) {
      if (f.status !== 'differs' && f.status !== 'missing') return;
      var dest = path.join(t.dir, f.name);
      try {
        if (f.status === 'differs') {
          var archiveDir = path.join(t.archive_config_dir, 'commander', 'archive', ts, path.basename(t.dir));
          fs.mkdirSync(archiveDir, { recursive: true });
          fs.copyFileSync(dest, path.join(archiveDir, f.name));
          f.archived_to = path.join(archiveDir, f.name);
        }
        fs.mkdirSync(t.dir, { recursive: true });
        var tmp = dest + '.ccc-sync-' + process.pid;
        fs.copyFileSync(path.join(result.source_dir, f.name), tmp);
        fs.chmodSync(tmp, 0o755);
        fs.renameSync(tmp, dest);
        f.status = 'copied';
      } catch (e) {
        f.status = 'apply_failed';
        f.error = e.code || e.message;
      }
    });
    t.in_sync = t.files.every(function(f) { return f.status === 'same' || f.status === 'copied'; });
  });
  result.in_sync = result.targets.every(function(t) { return t.in_sync; });
  return result;
}

/** Exit code: 0 in sync (or applied cleanly), 1 drift left or an apply failure. */
function exitCode(result) {
  return result.in_sync ? 0 : 1;
}

function render(result, home) {
  var tilde = function(p) { return home && p.indexOf(home + path.sep) === 0 ? '~' + p.slice(home.length) : p; };
  var out = ['ccc statusline sync ' + (result.applied ? '(applied)' : '(dry run; --apply copies)') + ': source ' + tilde(result.source_dir)];
  if (!result.targets.length) out.push('  no Claude config dirs found');
  result.targets.forEach(function(t) {
    if (!t.configured) {
      t.warnings.forEach(function(w) { out.push('  warning: ' + w); });
      out.push('  ' + tilde(t.dir) + '  (lanes ' + t.lanes.join(', ') + (t.from === 'custom' ? '; custom statusLine command, skipped)' : '; no status line configured, skipped)'));
      return;
    }
    out.push('  ' + tilde(t.dir) + '  (lanes ' + t.lanes.join(', ') + (t.from === 'default' ? '; no statusLine command, default dir' : '') + ')');
    t.warnings.forEach(function(w) { out.push('    warning: ' + w); });
    t.files.forEach(function(f) {
      var detail = f.status === 'differs' ? '+' + f.lines_added + '/-' + f.lines_removed + ' lines' : '';
      if (f.archived_to) detail = 'old copy archived to ' + tilde(f.archived_to);
      if (f.error) detail = f.error;
      out.push('    ' + (f.name + '                         ').slice(0, 26) + f.status + (detail ? '  ' + detail : ''));
    });
  });
  return out.join('\n');
}

module.exports = {
  SCHEMA: SCHEMA,
  FILES: FILES,
  targetDir: targetDir,
  shellWords: shellWords,
  plan: plan,
  apply: apply,
  exitCode: exitCode,
  render: render,
};
