#!/usr/bin/env node
// CC Commander — SessionStart license check hook
// Reads the current license tier and sets CCC_TIER in the environment
// so downstream skills can gate Pro features without re-validating.
//
// Outputs a single JSON line to stdout (Claude Code hook protocol).
// Logs tier badge to stderr (visible in Cowork Desktop session panel).

import { getLicenseTier, getLicenseKey } from '../lib/license.js';

const TIER_LABELS = {
  'starter':     'Starter',
  'pro-monthly': 'Pro (monthly)',
  'pro-yearly':  'Pro (annual)',
  'lifetime':    'Pro (lifetime)',
};

async function main() {
  let tier = 'starter';
  try {
    tier = await getLicenseTier();
  } catch {
    // Fail-open — never block a session due to license errors
  }

  // Expose tier for downstream skills (process-level, not persisted)
  process.env.CCC_TIER = tier;

  const label = TIER_LABELS[tier] ?? 'Starter';
  const isPro = tier !== 'starter';

  // Visible in Cowork Desktop session panel
  process.stderr.write(`[CCC] License: ${label}\n`);

  if (isPro) {
    // Optionally surface when Pro was last validated (non-blocking)
    try {
      const key = await getLicenseKey();
      if (key) {
        const masked = key.slice(0, 8) + '••••••••';
        process.stderr.write(`[CCC] License key: ${masked}\n`);
      }
    } catch {
      // Non-fatal
    }
  }

  // Hook protocol: always continue
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
}

main().catch(() => {
  // Last-resort catch — never let a license hook crash a session
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
});
