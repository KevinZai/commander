'use strict';

/**
 * CC Commander — Doctor Diagnostics
 * Checks environment health for auth, secrets, and config conflicts.
 *
 * Usage:
 *   node commander/doctor.js --auth
 *   ccc doctor --auth
 *   programmatic: require('./doctor').runAuthChecks()
 */

var fs = require('fs');
var path = require('path');
var os = require('os');
var childProcess = require('child_process');

var GREEN = '\x1b[32m';
var RED = '\x1b[31m';
var YELLOW = '\x1b[33m';
var RESET = '\x1b[0m';
var BOLD = '\x1b[1m';
var DIM = '\x1b[2m';

function check(label, ok, message, hint) {
  var icon = ok === true ? (GREEN + '✅' + RESET) : ok === 'warn' ? (YELLOW + '⚠️ ' + RESET) : (RED + '❌' + RESET);
  var status = ok === true ? 'OK' : ok === 'warn' ? 'WARN' : 'FAIL';
  return { label: label, ok: ok, message: message, hint: hint, icon: icon, status: status };
}

/**
 * Check if `op` CLI is available and authenticated.
 */
function checkOpCli() {
  try {
    var result = childProcess.execSync('op --version', { timeout: 3000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    var version = result.trim().split('\n')[0];
    return check('op CLI', true, '1Password CLI ' + version + ' (authenticated)');
  } catch (_) {
    return check('op CLI', false, 'Not found or not authenticated', 'Install: brew install 1password-cli && op signin');
  }
}

/**
 * Check that a given env var is NOT set (should be absent for OAuth safety).
 */
function checkEnvAbsent(varName, reason) {
  var val = process.env[varName];
  if (val) {
    return check(varName, false, 'Found in environment — ' + reason, 'Remove from shell: unset ' + varName);
  }
  return check(varName, true, 'NOT in environment (correct)');
}

/**
 * Check that MANAGED_BY_HOST is not set.
 */
function checkManagedByHost() {
  var val = process.env.MANAGED_BY_HOST;
  if (val) {
    return check('MANAGED_BY_HOST', 'warn', 'Set in environment — may cause OpenClaw inheritance issues', 'Strip via ccd wrapper: env -u MANAGED_BY_HOST claude ...');
  }
  return check('MANAGED_BY_HOST', true, 'NOT in environment (correct)');
}

/**
 * Check that `op` CLI is on PATH.
 */
function checkOpOnPath() {
  try {
    childProcess.execSync('which op', { timeout: 2000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return check('op on PATH', true, 'Found at ' + childProcess.execSync('which op', { encoding: 'utf8' }).trim());
  } catch (_) {
    return check('op on PATH', false, 'op not found on PATH', 'brew install 1password-cli');
  }
}

/**
 * Check that the global response-style.md voice file exists.
 */
function checkResponseStyle() {
  var stylePath = path.join(os.homedir(), '.claude', 'rules', 'common', 'response-style.md');
  if (fs.existsSync(stylePath)) {
    return check('response-style.md', true, 'Present at ~/.claude/rules/common/response-style.md');
  }
  return check('response-style.md', 'warn', 'Not found — CCC voice layer may be incomplete', 'Install CC Commander: /plugin install commander');
}

/**
 * Run all auth diagnostic checks.
 * @returns {{ checks: Array, summary: { ok: number, warn: number, fail: number } }}
 */
function runAuthChecks() {
  var checks = [
    checkOpOnPath(),
    checkOpCli(),
    checkEnvAbsent('ANTHROPIC_API_KEY', 'OAuth collision risk'),
    checkEnvAbsent('OPENAI_API_KEY', 'Codex OAuth incompatibility'),
    checkEnvAbsent('GEMINI_API_KEY', 'consider stripping'),
    checkManagedByHost(),
    checkResponseStyle(),
  ];

  var summary = { ok: 0, warn: 0, fail: 0 };
  for (var c of checks) {
    if (c.ok === true) summary.ok++;
    else if (c.ok === 'warn') summary.warn++;
    else summary.fail++;
  }

  return { checks: checks, summary: summary };
}

function summarizeDiagnosticResults(results) {
  var summary = { ok: 0, warn: 0, fail: 0 };
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'ok') summary.ok++;
    else if (results[i].status === 'warn') summary.warn++;
    else summary.fail++;
  }
  return summary;
}

function runFullStackChecks(root, options) {
  var diag = require('./cowork-plugin/skills/ccc-doctor/lib/diagnostics');
  var repoRoot = root || path.resolve(__dirname, '..');
  var checks = diag.runDiagnostics(repoRoot, options);
  return { checks: checks, summary: summarizeDiagnosticResults(checks) };
}

/**
 * Print auth check results to stdout.
 */
function printAuthReport(result) {
  var checks = result.checks;
  var summary = result.summary;

  process.stdout.write('\n' + BOLD + 'ccc doctor --auth' + RESET + '\n\n');

  for (var c of checks) {
    var line = c.icon + ' ' + c.label + ': ' + c.message;
    process.stdout.write(line + '\n');
    if (c.hint && c.ok !== true) {
      process.stdout.write(DIM + '     → ' + c.hint + RESET + '\n');
    }
  }

  process.stdout.write('\n');

  var summaryColor = summary.fail > 0 ? RED : summary.warn > 0 ? YELLOW : GREEN;
  process.stdout.write(summaryColor + BOLD + 'Summary: ' + summary.fail + ' critical, ' + summary.warn + ' warning, ' + summary.ok + ' ok' + RESET + '\n');

  if (summary.fail > 0) {
    process.stdout.write(DIM + 'Run `ccc doctor --auth --fix` to attempt automatic remediation.' + RESET + '\n');
  } else if (summary.warn > 0) {
    process.stdout.write(DIM + 'Warnings are non-blocking but worth addressing.' + RESET + '\n');
  } else {
    process.stdout.write(GREEN + 'All auth checks passed.' + RESET + '\n');
  }

  process.stdout.write('\n');
}

function printFullStackReport(result, opts) {
  var checks = result.checks;
  var summary = result.summary;
  var title = opts && opts.title ? opts.title : 'ccc --doctor';
  var tuneup = opts && opts.tuneup;

  process.stdout.write('\n' + BOLD + title + RESET + '\n\n');

  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    var icon = c.status === 'ok' ? (GREEN + '✅' + RESET) : c.status === 'warn' ? (YELLOW + '⚠️ ' + RESET) : (RED + '❌' + RESET);
    var line = icon + ' ' + c.category + ': ' + c.message;
    process.stdout.write(line + '\n');
    if (c.remediation && c.status !== 'ok') {
      process.stdout.write(DIM + '     → ' + c.remediation + RESET + '\n');
    }
  }

  process.stdout.write('\n');
  var summaryColor = summary.fail > 0 ? RED : summary.warn > 0 ? YELLOW : GREEN;
  process.stdout.write(summaryColor + BOLD + 'Summary: ' + summary.fail + ' critical, ' + summary.warn + ' warning, ' + summary.ok + ' ok' + RESET + '\n');
  if (tuneup) {
    process.stdout.write(DIM + 'Tuneup is read-only here; warnings above are suggested fixes to review before applying changes.' + RESET + '\n');
  } else if (summary.warn > 0) {
    process.stdout.write(DIM + 'Warnings are non-blocking but worth addressing.' + RESET + '\n');
  }
  process.stdout.write('\n');
}

module.exports = {
  runAuthChecks: runAuthChecks,
  runFullStackChecks: runFullStackChecks,
  printAuthReport: printAuthReport,
  printFullStackReport: printFullStackReport,
  checkOpCli: checkOpCli,
  checkEnvAbsent: checkEnvAbsent,
  checkManagedByHost: checkManagedByHost,
  checkResponseStyle: checkResponseStyle,
};

// ─── CLI entry ────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.includes('--auth')) {
    var result = runAuthChecks();
    printAuthReport(result);
    process.exit(result.summary.fail > 0 ? 1 : 0);
  } else if (args.includes('--tuneup')) {
    var tuneupResult = runFullStackChecks();
    printFullStackReport(tuneupResult, { title: 'ccc --tuneup', tuneup: true });
    process.exit(tuneupResult.summary.fail > 0 ? 1 : 0);
  } else if (args.includes('--doctor') || args.includes('--full')) {
    var fullResult = runFullStackChecks();
    printFullStackReport(fullResult, { title: 'ccc --doctor' });
    process.exit(fullResult.summary.fail > 0 ? 1 : 0);
  } else {
    process.stdout.write('Usage: node commander/doctor.js --auth | --doctor | --tuneup\n');
    process.exit(0);
  }
}
