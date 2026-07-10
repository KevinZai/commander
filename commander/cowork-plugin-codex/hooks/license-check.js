#!/usr/bin/env node
// CC Commander — SessionStart license check hook
//
// EXPLICIT NO-OP (2026-07-10, F6/F16): CC Commander's core is free forever —
// no feature gating, no paywalls, no license tiers on skills/agents/hooks.
// The old tier machinery (getLicenseTier → process.env.CCC_TIER) was dead
// code twice over: the env write died with this process and nothing ever
// consumed CCC_TIER. Rather than pretend tiers exist, this hook now just
// confirms the free posture. A hosted-infrastructure Pro tier is planned
// later (hosted MCP only) — if it ships, persist the tier to
// ~/.claude/commander/state.json (not a process env var) and give it a
// consumer before resurrecting any of this.
//
// Outputs a single JSON line to stdout (Claude Code hook protocol).

import { track } from '../lib/telemetry.mjs';

async function main() {
  // Visible in Cowork Desktop session panel
  process.stderr.write('[CCC] Core free forever — all skills, agents, hooks and MCPs enabled\n');

  // Telemetry
  track('hook_fired', { hook: 'SessionStart', handler: 'license-check' });

  // Hook protocol: always continue
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
}

main().catch(() => {
  // Last-resort catch — never let this hook crash a session
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
});
