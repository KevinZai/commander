'use strict';

const { execSync } = require('child_process');

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
    const args = [];

    if (opts.model) {
      args.push('--model', opts.model);
    }

    if (opts.approval === 'full-auto') {
      args.push('--full-auto');
    }

    if (opts.allowedTools) {
      for (const tool of opts.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    if (opts.quiet) {
      args.push('--quiet');
    }

    args.push(prompt);

    return args;
  },
};

module.exports = adapter;
