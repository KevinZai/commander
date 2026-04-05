'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');

var LOG_DIR = path.join(os.homedir(), '.claude', 'commander');
var LOG_FILE = path.join(LOG_DIR, 'errors.log');
var MAX_SIZE = 1024 * 1024; // 1MB max

function _write(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_SIZE) {
      fs.renameSync(LOG_FILE, LOG_FILE + '.old');
    }
    fs.appendFileSync(LOG_FILE, entry);
  } catch (_e) {} // never crash on logging
}

function log(error, context) {
  var entry = new Date().toISOString() + ' [' + (context || 'unknown') + '] ' +
    (error instanceof Error ? error.message + '\n' + error.stack : String(error)) + '\n';
  _write(entry);
}

function logError(err, context) {
  var ts = Date.now();
  var errId = 'CCC-ERR-' + ts;
  var entry = new Date(ts).toISOString() + ' [' + errId + '] [' + (context || 'unknown') + '] ' +
    (err instanceof Error ? err.message + '\n' + err.stack : String(err)) + '\n';
  _write(entry);
  return errId;
}

module.exports = { log: log, logError: logError, LOG_FILE: LOG_FILE };
