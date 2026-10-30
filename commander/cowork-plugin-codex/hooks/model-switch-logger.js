#!/usr/bin/env node
/**
 * model-switch-logger.js
 * Hooks: PreModelSwitch + PostModelSwitch
 *
 * Appends { timestamp, sessionId, event, from, to, requested, source } to
 * ~/.claude/commander/model-switches.jsonl.
 *
 * PreModelSwitch: never decides. Returning no permissionDecision leaves the
 *   switch allowed and lets any user or managed policy (deny > ask > allow)
 *   win. Kept fast because a PreModelSwitch hook that times out BLOCKS the
 *   switch.
 * PostModelSwitch: adds one line of additionalContext naming the Commander
 *   routing tiers (docs/reference/platform-facts-2026-10.md §1) so the model
 *   delegates by role after the change. The user's selected model is kept.
 *
 * Fail-open: always exits 0, writes only under ~/.claude/commander/.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { emitModel, emitSilent } from './lib/emit.mjs';

const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);

const ROUTING_TIERS =
  'Commander routing tiers: fable = deep (architecture, migrations, threat models, verifying load-bearing claims); ' +
  'opus = default (implementation, review, orchestration); sonnet = fast (bounded edits, docs, routers); ' +
  'haiku = bulk (classification, extraction, hook-side summaries). Keep the model the user selected for this session; ' +
  'pick a tier only for delegated subtasks.';

async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function main() {
  const input = await readInput();
  const event = input.hook_event_name;
  if (event === 'PreModelSwitch' || event === 'PostModelSwitch') {
    try {
      const dir = stateDir();
      await mkdir(dir, { recursive: true });
      const row = {
        timestamp: new Date().toISOString(),
        sessionId: clip(input.session_id || process.env.CLAUDE_SESSION_ID || 'unknown', 64),
        event,
        from: clip(input.from_model, 80) || null,
        to: clip(input.to_model, 80) || null,
        requested: input.requested_model == null ? null : clip(input.requested_model, 80),
        source: clip(input.source, 32) || null,
      };
      await appendFile(join(dir, 'model-switches.jsonl'), JSON.stringify(row) + '\n');
    } catch {
      // Logging failure must never affect the switch.
    }
  }
  if (event === 'PostModelSwitch') {
    const to = clip(input.to_model, 80);
    const lead = to ? `Session model is now ${to}. ` : '';
    process.stdout.write(JSON.stringify(emitModel('PostModelSwitch', lead + ROUTING_TIERS)) + '\n');
    return;
  }
  process.stdout.write(JSON.stringify(emitSilent()) + '\n');
}

setTimeout(() => process.exit(0), 4000).unref();
main().catch(() => {
  process.stdout.write(JSON.stringify(emitSilent()) + '\n');
});
