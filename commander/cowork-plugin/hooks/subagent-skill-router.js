#!/usr/bin/env node
/**
 * subagent-skill-router.js
 * Hook: SubagentStart
 *
 * Fleet and workflow workers do not see the UserPromptSubmit router, so each
 * subagent's task is scored against the same routes (hooks/lib/ccc-routes.json)
 * and the matching CCC skills are injected into its context as a short
 * <ccc-skills> block. A strong match tells the worker to load the skill before
 * starting; a weaker one lists it as an option. Manual skills that act outside
 * the conversation (deploy, push, publish, tracker writes) are never offered.
 *
 * Task text comes from the payload when the host provides it, else from the
 * Agent/Task call queued by the PreToolUse dispatcher (see recordAgentCall).
 * Workers a Workflow script spawns make no such call and get no block.
 *
 * Follows the lane's route mode (CCC_ROUTE_MODE, then config.json routeMode):
 * off and suggest stay silent; auto and always inject. CCC_SUBAGENT_ROUTE=off
 * turns off only this hook. Never blocks: any error is silent. Task text is
 * scored in memory and never logged.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { emitModel, emitSilent } from './lib/emit.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import { isMainModule } from './lib/code-mode.mjs';
import { loadRoutes, scoreRoutes, routeMode, detectHost, renderSubagentContext } from './lib/route-scorer.mjs';
import { readablePath, stateDir } from '../lib/lane-state.js';

// Claude Code's SubagentStart payload carries no task text (only session_id,
// transcript_path, cwd, agent_id, agent_type), and the parent transcript can
// lag behind the hook. So the PreToolUse dispatcher calls recordAgentCall()
// for every Agent/Task call (it runs before the subagent starts, also for
// calls made from Code Mode programs), queueing the task as one file per call.
// SubagentStart then claims the oldest queued call for its agent type with an
// atomic rename, so parallel workers each get their own task, in spawn order.
const AGENT_TOOLS = new Set(['Agent', 'Task']);
const QUEUE_TTL_MS = 10 * 60 * 1000;
const TEXT_MAX = 2000;

function slug(value, fallback) {
  return String(value || '').replace(/[^\w-]/g, '').slice(0, 80) || fallback;
}

function queueDir(sessionId) {
  return join(stateDir(), 'route-state', `${slug(sessionId, 'default')}-agents`);
}

let seq = 0;

/** PreToolUse handler: queue an Agent/Task call's task text. Never blocks. */
export function recordAgentCall(input = {}) {
  try {
    const tool = input.tool_name || input.toolName || '';
    const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : null;
    if (!AGENT_TOOLS.has(tool) || !ti) return emitSilent();
    const text = [ti.description, ti.prompt].filter((v) => typeof v === 'string' && v.trim()).join('\n').slice(0, TEXT_MAX);
    if (!text) return emitSilent();
    const dir = queueDir(input.session_id);
    mkdirSync(dir, { recursive: true });
    const name = `${String(Date.now()).padStart(15, '0')}-${process.pid}-${seq++}-${slug(input.tool_use_id, 'call')}.json`;
    const tmp = join(dir, `.${name}.tmp`);
    writeFileSync(tmp, JSON.stringify({ type: String(ti.subagent_type || ''), text }));
    renameSync(tmp, join(dir, name));
  } catch {
    // routing state is best-effort
  }
  return emitSilent();
}

/** SubagentStart: claim the oldest queued call for this agent type, or ''. */
export function claimTask(input = {}) {
  const dir = queueDir(input.session_id);
  let names;
  try { names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort(); } catch { return ''; }
  const type = String(input.agent_type || input.subagent_type || '');
  const now = Date.now();
  for (const name of names) {
    const file = join(dir, name);
    if (now - Number(name.split('-')[0]) > QUEUE_TTL_MS) {
      try { unlinkSync(file); } catch {}
      continue;
    }
    let entry;
    try { entry = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    if (type && entry.type && entry.type !== type) continue;
    // The rename is the claim: only one concurrent SubagentStart wins it.
    try { renameSync(file, `${file}.claimed`); } catch { continue; }
    try { unlinkSync(`${file}.claimed`); } catch {}
    return typeof entry.text === 'string' ? entry.text : '';
  }
  return '';
}

function savedRouteMode() {
  try {
    const config = JSON.parse(readFileSync(readablePath('config.json'), 'utf8'));
    return config && typeof config.routeMode === 'string' ? config.routeMode : null;
  } catch {
    return null;
  }
}

function firstString(...values) {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v;
  return '';
}

/** The subagent's task text, from whichever field this host provides. */
export function taskText(input = {}) {
  const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
  const sub = input.subagent && typeof input.subagent === 'object' ? input.subagent : {};
  const desc = firstString(input.description, ti.description, sub.description);
  const prompt = firstString(input.prompt, input.task, sub.prompt, ti.prompt, ti.task);
  return [desc, prompt].filter(Boolean).join('\n');
}

export function run(input = {}, env = process.env) {
  try {
    if (String(env.CCC_SUBAGENT_ROUTE || '').toLowerCase() === 'off') return emitSilent();
    const mode = routeMode(env, savedRouteMode());
    if (mode !== 'auto' && mode !== 'always') return emitSilent();
    const text = taskText(input) || claimTask(input);
    // A worker already told to use a specific skill needs no hint.
    if (!text.trim() || /(?:^|\s)[/$]ccc[\w-]*|commander:ccc/.test(text)) return emitSilent();
    const context = renderSubagentContext(scoreRoutes(text, loadRoutes()), detectHost(env), mode);
    return context ? emitModel('SubagentStart', context) : emitSilent();
  } catch {
    return emitSilent();
  }
}

if (isMainModule(import.meta.url)) {
  readStdinJson()
    .then((input) => run(input))
    .catch(() => emitSilent())
    .then((out) => process.stdout.write(JSON.stringify(out) + '\n'));
}
