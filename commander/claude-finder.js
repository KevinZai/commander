'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var _cached = null;

function resolve() {
  if (_cached) return _cached;

  // 1. Explicit override
  if (process.env.CCC_CLAUDE_PATH) {
    _cached = process.env.CCC_CLAUDE_PATH;
    return _cached;
  }

  // 2. which claude
  try {
    var cp = require('child_process');
    var found = cp.execFileSync('which', ['claude'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (found) {
      _cached = found;
      return _cached;
    }
  } catch (_e) {}

  // 3. Native installer: ~/.local/share/claude/versions/*/claude — pick latest
  try {
    var versionsDir = path.join(os.homedir(), '.local', 'share', 'claude', 'versions');
    if (fs.existsSync(versionsDir)) {
      var versions = fs.readdirSync(versionsDir).sort().reverse();
      for (var i = 0; i < versions.length; i++) {
        var candidate = path.join(versionsDir, versions[i], 'claude');
        if (fs.existsSync(candidate)) {
          _cached = candidate;
          return _cached;
        }
      }
    }
  } catch (_e) {}

  // 4. Homebrew
  var brewPath = '/opt/homebrew/bin/claude';
  if (fs.existsSync(brewPath)) {
    _cached = brewPath;
    return _cached;
  }

  // 5. Fallback
  _cached = 'claude';
  return _cached;
}

module.exports = { resolve: resolve };
