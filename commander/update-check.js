#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var pkg = require('../package.json');
var LOCAL_VERSION = pkg.version;

var REPO_RAW_URL = 'https://raw.githubusercontent.com/KevinZai/commander/main/package.json';
var CACHE_FILE = path.join(require('os').homedir(), '.claude', 'commander', 'update-cache.json');
var CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function semverCompare(a, b) {
  var pa = a.split('.').map(Number);
  var pb = b.split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function readCache() {
  try {
    var data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - data.timestamp < CACHE_TTL_MS) return data.remoteVersion;
  } catch (_) {}
  return null;
}

function writeCache(remoteVersion) {
  try {
    var dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ remoteVersion: remoteVersion, timestamp: Date.now(), localVersion: LOCAL_VERSION }));
  } catch (_) {}
}

function fetchRemoteVersion(callback) {
  var cached = readCache();
  if (cached) return callback(null, cached);

  var req = https.get(REPO_RAW_URL, { timeout: 3000 }, function(res) {
    var body = '';
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      try {
        var remote = JSON.parse(body);
        if (typeof remote.version !== 'string' || !/^\d+\.\d+\.\d+/.test(remote.version)) {
          return callback(new Error('Invalid remote version format'));
        }
        writeCache(remote.version);
        callback(null, remote.version);
      } catch (e) { callback(e); }
    });
  });
  req.on('error', function(e) { callback(e); });
  req.on('timeout', function() { req.destroy(); callback(new Error('timeout')); });
}

function main() {
  fetchRemoteVersion(function(err, remoteVersion) {
    if (err || !remoteVersion) return; // Silent fail
    if (semverCompare(remoteVersion, LOCAL_VERSION) > 0) {
      process.stdout.write('\n  \x1b[33m⬆ CCC update available: v' + LOCAL_VERSION + ' → v' + remoteVersion + '\x1b[0m\n');
      process.stdout.write('  \x1b[2mRun: cd ~/clawd/projects/cc-commander && git pull\x1b[0m\n\n');
    }
  });
}

main();
