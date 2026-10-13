'use strict';

const { execSync } = require('child_process');

function validateOptions(prompt, opts) {
  if (typeof prompt !== 'string' || prompt.includes('\0')) {
    throw new TypeError('Codex prompt must be a string without null bytes');
  }
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError('Codex options must be an object');
  }
  if (opts.allowedTools != null && (!Array.isArray(opts.allowedTools) || opts.allowedTools.length > 0)) {
    throw new Error('Codex does not support allowedTools; use an enforced sandbox or configured tool policy');
  }
  if (opts.quiet) {
    throw new Error('Codex does not support quiet; configure output streams in the calling process');
  }
  if (opts.approval != null && !['full-auto', 'on-request', 'never'].includes(opts.approval)) {
    throw new Error('Unsupported Codex approval mode');
  }
  if (opts.sandbox != null && !['read-only', 'workspace-write'].includes(opts.sandbox)) {
    throw new Error('Codex sandbox must be read-only or workspace-write');
  }
  for (const field of ['model', 'cwd']) {
    if (opts[field] != null && (typeof opts[field] !== 'string' || !opts[field] || opts[field].includes('\0'))) {
      throw new TypeError(`Codex ${field} must be a nonempty string without null bytes`);
    }
  }
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

  buildArgs(prompt, opts = {}) {
    validateOptions(prompt, opts);
    const args = [];
    const approval = opts.approval === 'full-auto' ? 'on-request' : opts.approval;
    // Approval is a root CLI option; the retired full-auto flag also selected workspace-write.
    if (approval) args.push('--ask-for-approval', approval);
    args.push('exec');
    if (opts.model) args.push('--model', opts.model);
    if (opts.cwd) args.push('--cd', opts.cwd);
    const sandbox = opts.sandbox ?? (opts.approval === 'full-auto' ? 'workspace-write' : 'read-only');
    args.push('--sandbox', sandbox);
    // Keep a prompt beginning with a dash from becoming a CLI option.
    args.push('--', prompt);
    return args;
  },
};

module.exports = adapter;
