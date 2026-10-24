/**
 * Fleet <-> CCC routing. Recognizes requests about the Fleet control plane
 * (lanes, Superfleet batches, sweeps) and points the session at the Fleet
 * skill and its read-only commands, with the `ccc checkin` line attached.
 * CCC's own intents, including /ccc-fleet (local parallel agents), stay in CCC.
 *
 * This module never launches, stops or messages anything: it only builds the
 * context text. The one subprocess is `ccc checkin --no-cli` (3 s cap).
 * CCC_FLEET_ROUTE=off disables it.
 */
import { existsSync, statSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { normalizePrompt } from './route-scorer.mjs';

// Order matters: the first match wins (actions before status questions).
// Each needs a Fleet noun (lane, fleet, Superfleet, an SF-<KEY> batch key);
// a generic "batch" or "account" is not enough.

export const FLEET_INTENTS = [
  {
    id: 'launch',
    re: /\b(launch|start|spin up|kick off|dispatch)\b.{0,40}\b(lanes?|superfleet( batch(es)?)?|SF-[A-Z][\w-]*)\b/i,
    commands: ['fleet limits', 'fleet tasks'],
    note: 'Pick the lane with headroom and prepare the brief; launching is done through the Fleet skill\'s own approval flow, never from this hint.',
  },
  {
    id: 'finish',
    re: /\b(finish|close out|wrap up)\b.{0,20}\b(the |this )?(superfleet( batch)?|lane batch|SF-[A-Z][\w-]*)\b/i,
    commands: ['fleet tasks'],
    note: 'Finishing follows the batch brief (push, draft PR, FINAL STATUS); this hint does not do it.',
  },
  {
    id: 'sweep',
    re: /\b(lane[- ]sweep|sweep (the |all )?lanes?|stale lanes?|stuck lanes?)\b/i,
    commands: ['fleet status', 'fleet tasks'],
    note: 'Report stale or stuck lanes; stopping one is a separate, approved action.',
  },
  {
    id: 'usage',
    re: /\b(lanes?|fleet)\b.{0,20}\b(usage|headroom|limits?|capacity)\b|\bwhich lane has\b/i,
    commands: ['fleet limits', 'fleet usage'],
  },
  {
    id: 'batch-status',
    re: /\b(superfleet|SF-[A-Z][\w-]*)\b.{0,20}\b(status|progress)\b|\bstatus of (the |my )?(superfleet|SF-[A-Z][\w-]*)\b/i,
    commands: ['fleet tasks', 'fleet status'],
  },
  {
    id: 'status',
    re: /\bwhat'?s running\b.{0,20}\b(on )?(the )?(fleet|lanes?)\b|\b(fleet|lanes?) status\b|\bwhat (is|are) the (fleet|lanes?) doing\b|\bwhat'?s running on (the )?fleet\b/i,
    commands: ['fleet status', 'fleet tasks'],
  },
];

// Local orchestration words: these prompts belong to CCC's /ccc-fleet.
const CCC_LOCAL = /\b(parallel|subagents?|fan[- ]out|worktrees?|agents? team|multi-agent)\b/i;

/**
 * Fleet routing is an opt-in integration: on with CCC_FLEET_ROUTE=on, or
 * automatically when the claude-fleet skill is installed; CCC_FLEET_ROUTE=off
 * always wins. (A bare `fleet` binary is not enough: other tools use that name.)
 */
export function fleetRouteEnabled(env = process.env, tools = fleetTools(env)) {
  const flag = String(env.CCC_FLEET_ROUTE || '').toLowerCase();
  if (flag === 'off') return false;
  return flag === 'on' || tools.skill;
}

/** The matching Fleet intent for a prompt, or null. */
export function matchFleetIntent(prompt) {
  // Same normalization as route scoring: quoted code, URLs and pastes never route.
  const text = normalizePrompt(prompt);
  if (!text.trim() || CCC_LOCAL.test(text)) return null;
  return FLEET_INTENTS.find((intent) => intent.re.test(text)) || null;
}

function onPath(bin, env) {
  for (const dir of String(env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    try { if (statSync(join(dir, bin)).isFile()) return true; } catch { /* not here */ }
  }
  return false;
}

/**
 * Which Fleet tools exist here: the `fleet` CLI and the claude-fleet skill in
 * either host's skill dirs (Claude: <config dir>/skills, <cwd>/.claude/skills;
 * Codex: <cwd>/.agents/skills, ~/.agents/skills, /etc/codex/skills).
 */
export function fleetTools(env = process.env, cwd = process.cwd()) {
  const home = env.HOME || homedir();
  const configDir = env.CCC_CONFIG_DIR || env.CLAUDE_CONFIG_DIR || join(home, '.claude');
  const skillDirs = [
    join(resolve(configDir), 'skills'),
    join(resolve(cwd), '.claude', 'skills'),
    join(resolve(cwd), '.agents', 'skills'),
    join(home, '.agents', 'skills'),
    '/etc/codex/skills',
  ];
  return {
    cli: onPath('fleet', env),
    skill: skillDirs.some((dir) => existsSync(join(dir, 'claude-fleet', 'SKILL.md'))),
  };
}

const CHECKIN_LINE = /^CCC check-in (OK|BLOCKED): /;

/**
 * One-line `ccc checkin --no-cli`, or null when ccc is missing, slow, or too
 * old to have `checkin` (anything that is not a check-in line is dropped).
 */
export function checkinLine(env = process.env) {
  if (!onPath('ccc', env)) return null;
  let out = '';
  try {
    out = execFileSync('ccc', ['checkin', '--no-cli'], { env, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    // A blocked check-in exits non-zero but still prints its line.
    out = err && typeof err.stdout === 'string' ? err.stdout : '';
  }
  const line = out.split('\n').map((l) => l.trim()).find((l) => CHECKIN_LINE.test(l));
  return line ? line.slice(0, 300) : null;
}

/** Model context for a Fleet intent. mode 'suggest' offers the route instead of directing it. */
export function renderFleetContext(intent, tools, checkin, mode = 'auto') {
  if (!tools.cli && !tools.skill) {
    return `<ccc-fleet-route intent="${intent.id}">\nThis looks like a Fleet control-plane request, but no Fleet tools (the \`fleet\` CLI or the claude-fleet skill) are installed here. Say so in one line and answer from what you can read; do not substitute /ccc-fleet, which runs local parallel agents.\n</ccc-fleet-route>`;
  }
  const lines = [`<ccc-fleet-route intent="${intent.id}">`];
  lines.push('This is a Fleet control-plane request (lanes, batches), not /ccc-fleet (local parallel agents).');
  if (tools.skill) {
    lines.push(mode === 'suggest'
      ? 'Offer the claude-fleet skill as an option and ask before using it.'
      : 'Use the claude-fleet skill.');
  }
  if (tools.cli) lines.push(`Read-only commands: ${intent.commands.map((c) => '`' + c + '`').join(', ')}.`);
  if (intent.note) lines.push(intent.note);
  lines.push('Do not launch, stop or message lanes because of this hint.');
  if (checkin) lines.push(`CCC check-in: ${checkin}`);
  lines.push('</ccc-fleet-route>');
  return lines.join('\n');
}
