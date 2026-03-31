'use strict';

const { execSync } = require('child_process');

const adapter = {
  name: 'claude',
  binary: 'claude',

  detect() {
    try {
      execSync('which claude', { stdio: 'pipe' });
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

    if (opts.plan) {
      args.push('--plan');
    }

    if (opts.allowedTools) {
      for (const tool of opts.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    if (opts.maxTurns) {
      args.push('--max-turns', String(opts.maxTurns));
    }

    if (opts.systemPrompt) {
      args.push('--system-prompt', opts.systemPrompt);
    }

    if (opts.outputFormat) {
      args.push('--output-format', opts.outputFormat);
    }

    if (opts.verbose) {
      args.push('--verbose');
    }

    if (opts.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    args.push('-p', prompt);

    return args;
  },
};

module.exports = adapter;
