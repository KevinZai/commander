'use strict';

const { execSync } = require('child_process');

const adapter = {
  name: 'gemini',
  binary: 'gemini',

  detect() {
    try {
      execSync('which gemini', { stdio: 'pipe' });
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

    if (opts.sandbox) {
      args.push('--sandbox');
    }

    if (opts.allowedTools) {
      for (const tool of opts.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    if (opts.outputFormat) {
      args.push('--output-format', opts.outputFormat);
    }

    if (opts.verbose) {
      args.push('--verbose');
    }

    args.push('-p', prompt);

    return args;
  },
};

module.exports = adapter;
