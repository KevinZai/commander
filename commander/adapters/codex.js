'use strict';

const { execSync } = require('child_process');

const APPROVALS = ['full-auto', 'on-request', 'never'];
const SANDBOXES = ['read-only', 'workspace-write'];
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/i;
const SESSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function assertSafeString(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\0')) {
    throw new TypeError(`Codex ${label} must be a nonempty string without null bytes`);
  }
}

function validatePrompt(prompt) {
  if (typeof prompt !== 'string' || prompt.includes('\0')) {
    throw new TypeError('Codex prompt must be a string without null bytes');
  }
}

function validateCommonOptions(opts) {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError('Codex options must be an object');
  }
  if (opts.allowedTools != null && (!Array.isArray(opts.allowedTools) || opts.allowedTools.length > 0)) {
    throw new Error('Codex does not support allowedTools; use an enforced sandbox or configured tool policy');
  }
  if (opts.quiet) {
    throw new Error('Codex does not support quiet; configure output streams in the calling process');
  }
  if (opts.approval != null && !APPROVALS.includes(opts.approval)) {
    throw new Error('Unsupported Codex approval mode');
  }
  if (opts.sandbox != null && !SANDBOXES.includes(opts.sandbox)) {
    throw new Error('Codex sandbox must be read-only or workspace-write');
  }
  for (const field of ['model', 'cwd', 'outputLastMessage']) {
    if (opts[field] != null) assertSafeString(opts[field], field);
  }
  if (opts.json != null && typeof opts.json !== 'boolean') {
    throw new TypeError('Codex json must be a boolean');
  }
}

function rootArgs(opts) {
  const args = [];
  const approval = opts.approval === 'full-auto' ? 'on-request' : opts.approval;
  // Approval is a root CLI option; the retired full-auto flag also selected workspace-write.
  if (approval) args.push('--ask-for-approval', approval);
  return args;
}

function resolveSandbox(opts) {
  return opts.sandbox ?? (opts.approval === 'full-auto' ? 'workspace-write' : 'read-only');
}

function outputArgs(opts) {
  const args = [];
  if (opts.model) args.push('--model', opts.model);
  if (opts.json) args.push('--json');
  if (opts.outputLastMessage) args.push('--output-last-message', opts.outputLastMessage);
  return args;
}

// `codex exec resume` has no --cd or --sandbox flag: the session is looked up
// relative to the process cwd, and the sandbox is set by a config override.
function buildResumeArgs(prompt, opts) {
  if (opts.cwd != null) {
    throw new Error('Codex exec resume has no --cd; run it with the session directory as the process cwd');
  }
  if (opts.resume !== 'last') {
    assertSafeString(opts.resume, 'resume');
    if (!SESSION_PATTERN.test(opts.resume)) {
      throw new Error('Codex resume must be "last" or a session id');
    }
  }
  const args = rootArgs(opts);
  args.push('exec', 'resume');
  if (opts.resume === 'last') args.push('--last');
  args.push('-c', `sandbox_mode="${resolveSandbox(opts)}"`);
  args.push(...outputArgs(opts));
  if (opts.resume !== 'last') args.push(opts.resume);
  if (prompt) args.push('--', prompt);
  return args;
}

const adapter = {
  name: 'codex',
  binary: 'codex',

  detect() {
    try {
      execSync('which codex', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * `codex exec`, or `codex exec resume` when opts.resume is set.
   * opts: model, cwd, sandbox (read-only | workspace-write), approval,
   * json (JSONL events on stdout), outputLastMessage (file path),
   * resume ('last' | session id or thread name).
   */
  buildArgs(prompt, opts = {}) {
    validatePrompt(prompt);
    validateCommonOptions(opts);
    if (opts.resume != null) return buildResumeArgs(prompt, opts);

    const args = rootArgs(opts);
    args.push('exec');
    args.push(...outputArgs(opts));
    if (opts.cwd) args.push('--cd', opts.cwd);
    args.push('--sandbox', resolveSandbox(opts));
    // Keep a prompt beginning with a dash from becoming a CLI option.
    args.push('--', prompt);
    return args;
  },

  /**
   * `codex exec review`: headless review, always read-only.
   * opts: exactly one of uncommitted (true) | base (branch) | commit (sha);
   * optional title, model, json, outputLastMessage, instructions (prompt).
   */
  buildReviewArgs(opts = {}) {
    validateCommonOptions(opts);
    if (opts.sandbox != null && opts.sandbox !== 'read-only') {
      throw new Error('Codex review runs read-only');
    }
    if (opts.cwd != null) {
      throw new Error('Codex review has no --cd; run it with the repository as the process cwd');
    }
    const targets = ['uncommitted', 'base', 'commit'].filter(
      (key) => opts[key] != null && opts[key] !== false
    );
    if (targets.length !== 1) {
      throw new Error('Codex review needs exactly one of uncommitted, base or commit');
    }
    if (opts.uncommitted != null && opts.uncommitted !== false && opts.uncommitted !== true) {
      throw new TypeError('Codex review uncommitted must be a boolean');
    }
    if (opts.base != null) {
      assertSafeString(opts.base, 'base');
      if (!BRANCH_PATTERN.test(opts.base) || opts.base.includes('..')) {
        throw new Error('Codex review base must be a plain branch name');
      }
    }
    if (opts.commit != null) {
      assertSafeString(opts.commit, 'commit');
      if (!COMMIT_PATTERN.test(opts.commit)) throw new Error('Codex review commit must be a hex SHA');
    }
    if (opts.title != null) assertSafeString(opts.title, 'title');
    if (opts.instructions != null) validatePrompt(opts.instructions);

    const args = rootArgs(opts);
    args.push('exec', 'review', '-c', 'sandbox_mode="read-only"');
    if (opts.uncommitted === true) args.push('--uncommitted');
    if (opts.base != null) args.push('--base', opts.base);
    if (opts.commit != null) args.push('--commit', opts.commit);
    if (opts.title != null) args.push('--title', opts.title);
    args.push(...outputArgs(opts));
    if (opts.instructions != null) args.push('--', opts.instructions);
    return args;
  },
};

module.exports = adapter;
