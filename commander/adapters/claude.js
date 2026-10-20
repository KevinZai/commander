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
    if (opts.plan) opts = { ...opts, permissionMode: 'plan' };
    const args = require('../remote-session').interactiveArgs({ ...opts, skipPermissions: opts.dangerouslySkipPermissions });
    args.push(prompt);

    return args;
  },
};

module.exports = adapter;
