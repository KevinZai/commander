#!/usr/bin/env node
/**
 * fleet-telemetry.js
 * Hook: TeammateIdle (an agent-team teammate is about to go idle)
 *
 * Appends { timestamp, type, sessionId, teammate, agentId, team } to
 * ~/.claude/commander/fleet/teammates.jsonl, next to fleet-notify.js's
 * notifications.jsonl.
 *
 * Prints nothing and always exits 0: exit 2 would keep the teammate working
 * and {continue:false} would stop it, and this hook only observes.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';

const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);

async function main() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  let input = {};
  try { if (raw) input = JSON.parse(raw) || {}; } catch { input = {}; }
  if (typeof input !== 'object') return;
  if (input.hook_event_name && input.hook_event_name !== 'TeammateIdle') return;

  const dir = join(stateDir(), 'fleet');
  await mkdir(dir, { recursive: true });
  const row = {
    timestamp: new Date().toISOString(),
    type: 'teammate_idle',
    sessionId: clip(input.session_id || process.env.CLAUDE_SESSION_ID || 'unknown', 64),
    teammate: clip(input.teammate_name, 64) || null,
    agentId: clip(input.agent_id, 64) || null,
    team: clip(input.team_name, 64) || null,
  };
  await appendFile(join(dir, 'teammates.jsonl'), JSON.stringify(row) + '\n');
}

setTimeout(() => process.exit(0), 4000).unref();
main().catch(() => {}).finally(() => { process.exitCode = 0; });
