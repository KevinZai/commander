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
 * The whole task (up to TASK_CHARS) is scored in pieces, so a long shared
 * preamble does not hide the job. Workers a Workflow script spawns make no
 * Agent call, so their text never reaches this hook: they get a short
 * pre-run check that asks them to pick a fitting skill themselves. In always
 * mode a worker whose task matched nothing gets the same check.
 *
 * Follows the lane's route mode (CCC_ROUTE_MODE, then config.json routeMode):
 * off and suggest stay silent; auto and always inject. CCC_SUBAGENT_ROUTE=off
 * turns off only this hook. Never blocks: any error is silent. Task text is
 * scored in memory and never logged; a queued call stores only its scored
 * route ids, hashes of its text and an 80-character label, and queues older
 * than the TTL are swept across all sessions on each new call.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { emitModel, emitSilent } from './lib/emit.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import { isMainModule } from './lib/code-mode.mjs';
import { loadRoutes, scoreTask, routeMode, detectHost, renderSubagentContext, renderSubagentCheck } from './lib/route-scorer.mjs';
import { readablePath, stateDir } from '../lib/lane-state.js';

// Claude Code's SubagentStart payload carries no task text (only session_id,
// transcript_path, cwd, agent_id, agent_type), and the parent transcript can
// lag behind the hook. So the PreToolUse dispatcher calls recordAgentCall()
// for every Agent/Task call (it runs before the subagent starts, also for
// calls made from Code Mode programs), queueing the task as one file per call.
// SubagentStart then claims the oldest queued call for its agent type with an
// atomic rename, so parallel workers each get their own task, in spawn order.
// A queued call is only trusted briefly: a subagent starts within seconds of
// its Agent call, so an entry older than this belongs to a call that was
// denied, cancelled or failed and is dropped instead of handed out.
const AGENT_TOOLS = new Set(['Agent', 'Task']);
const QUEUE_TTL_MS = 60 * 1000;
const DEFAULT_AGENT_TYPE = 'general-purpose';

function slug(value) {
  return String(value || '').replace(/[^\w-]/g, '').slice(0, 80);
}

function queueRoot() {
  return join(stateDir(), 'route-state');
}

function queueDir(sessionId) {
  return join(queueRoot(), `${slug(sessionId)}-agents`);
}

// Same text in, same hash out, whatever the whitespace.
function textHash(text) {
  return createHash('sha256').update(String(text || '').replace(/\s+/g, ' ').trim()).digest('hex');
}

// Remove expired entries from every session's queue (an interrupted session
// never claims its own), and the queue directories they leave empty.
function sweepQueues() {
  let dirs;
  try { dirs = readdirSync(queueRoot()).filter((d) => d.endsWith('-agents')); } catch { return; }
  for (const d of dirs) {
    const dir = join(queueRoot(), d);
    let names;
    try { names = readdirSync(dir); } catch { continue; }
    let left = names.length;
    for (const name of names) {
      const age = ageOf(name);
      if (!(age >= 0) || age > QUEUE_TTL_MS) { try { unlinkSync(join(dir, name)); left -= 1; } catch {} }
    }
    if (!left) try { rmdirSync(dir); } catch {}
  }
}

function routingOn(env = process.env) {
  if (String(env.CCC_SUBAGENT_ROUTE || '').toLowerCase() === 'off') return false;
  const mode = routeMode(env, savedRouteMode());
  return mode === 'auto' || mode === 'always';
}

let seq = 0;

/**
 * Queue an Agent/Task call's task text for SubagentStart. Called by the
 * PreToolUse dispatcher only after no handler there denied the call. Nothing
 * is written when routing is off or the call has no session id.
 */
export function recordAgentCall(input = {}, env = process.env) {
  try {
    const tool = input.tool_name || input.toolName || '';
    const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : null;
    if (!AGENT_TOOLS.has(tool) || !ti || !slug(input.session_id) || !routingOn(env)) return emitSilent();
    const desc = typeof ti.description === 'string' ? ti.description : '';
    const prompt = typeof ti.prompt === 'string' ? ti.prompt : '';
    const text = [desc, prompt].filter((v) => v.trim()).join('\n');
    if (!text) return emitSilent();
    sweepQueues();
    // The text itself is not stored: only what SubagentStart needs.
    const named = NAMED_SKILL.test(text);
    const routes = named ? [] : scoreTask(text, loadRoutes()).slice(0, 5).map((c) => ({ id: c.route.id, score: c.score, patternHits: c.patternHits }));
    const hashes = [...new Set([text, desc, prompt].filter((v) => v.trim()).map(textHash))];
    const dir = queueDir(input.session_id);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const name = `${String(Date.now()).padStart(15, '0')}-${process.pid}-${seq++}-${slug(input.tool_use_id) || 'call'}.json`;
    const tmp = join(dir, `.${name}.tmp`);
    const label = firstString(ti.description, ti.prompt).trim().split('\n')[0].slice(0, 80);
    writeFileSync(tmp, JSON.stringify({ type: String(ti.subagent_type || DEFAULT_AGENT_TYPE), hashes, named, routes, label }), { mode: 0o600 });
    renameSync(tmp, join(dir, name));
  } catch {
    // routing state is best-effort
  }
  return emitSilent();
}

/** Drop a queued call whose tool failed or was denied (PostToolUseFailure, PermissionDenied). */
export function dropAgentCall(input = {}) {
  try {
    const id = slug(input.tool_use_id);
    if (!id || !slug(input.session_id)) return;
    const dir = queueDir(input.session_id);
    for (const name of readdirSync(dir)) if (name.endsWith(`-${id}.json`)) try { unlinkSync(join(dir, name)); } catch {}
  } catch {}
}

// A payload may carry only the prompt, only the description, or both; the
// entry stores a hash of each.
function sameTask(entry, own) {
  return !!own.trim() && Array.isArray(entry.hashes) && entry.hashes.includes(textHash(own));
}

function ageOf(name) {
  return Date.now() - Number(name.replace(/^\./, '').split('-')[0]);
}

/**
 * SubagentStart: claim the oldest live queued call for this agent type, as
 * { named, routes, label }, or null. A worker that already carries its own task text
 * (`own`) claims only the entry with that exact text, so it never takes
 * another worker's entry. Expired entries and leftover temp or claimed files
 * are removed on the way; a worker without a type or session id claims nothing.
 */
export function claimTask(input = {}, own = '') {
  const type = String(input.agent_type || input.subagent_type || '');
  if (!type || !slug(input.session_id)) return null;
  const dir = queueDir(input.session_id);
  let names;
  try { names = readdirSync(dir).sort(); } catch { return null; }
  let claimed = null;
  for (const name of names) {
    const file = join(dir, name);
    if (!name.endsWith('.json') || ageOf(name) > QUEUE_TTL_MS) {
      if (ageOf(name) > QUEUE_TTL_MS || !(ageOf(name) >= 0)) try { unlinkSync(file); } catch {}
      continue;
    }
    if (claimed) continue;
    let entry;
    try { entry = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    if ((entry.type || DEFAULT_AGENT_TYPE) !== type) continue;
    if (own && !sameTask(entry, own)) continue;
    // The rename is the claim: only one concurrent SubagentStart wins it.
    try { renameSync(file, `${file}.claimed`); } catch { continue; }
    try { unlinkSync(`${file}.claimed`); } catch {}
    claimed = {
      named: entry.named === true,
      routes: Array.isArray(entry.routes) ? entry.routes : [],
      label: typeof entry.label === 'string' ? entry.label : '',
    };
  }
  return claimed;
}

function savedRouteMode() {
  try {
    const config = JSON.parse(readFileSync(readablePath('config.json'), 'utf8'));
    return config && typeof config.routeMode === 'string' ? config.routeMode : null;
  } catch {
    return null;
  }
}

// A worker prompt that already names a CCC skill.
const NAMED_SKILL = /(?:^|\s)[/$]ccc[\w-]*|commander:ccc/;

/** Rebuild scored candidates from a queued entry's route ids. */
function fromQueued(list) {
  const byId = new Map(loadRoutes().map((r) => [r.id, r]));
  return list
    .filter((c) => c && byId.has(c.id) && typeof c.score === 'number')
    .map((c) => ({ route: byId.get(c.id), score: c.score, patternHits: c.patternHits || 0 }));
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
    if (!routingOn(env)) return emitSilent();
    const mode = routeMode(env, savedRouteMode());
    // A worker that carries its own task consumes only its own queue entry.
    const own = taskText(input);
    const claimed = claimTask(input, own);
    const host = detectHost(env);
    // No task reached the hook (a Workflow script's worker): pre-run check.
    if (!own.trim() && !claimed) return emitModel('SubagentStart', renderSubagentCheck(host));
    // A worker already told to use a specific skill needs no hint.
    if (own ? NAMED_SKILL.test(own) : claimed.named) return emitSilent();
    // Queue-matched tasks are named in the block, so a mismatched worker ignores it.
    const forTask = own ? '' : claimed.label;
    const candidates = own ? scoreTask(own, loadRoutes()) : fromQueued(claimed.routes);
    const context = renderSubagentContext(candidates, host, mode, forTask)
      || (mode === 'always' ? renderSubagentCheck(host, forTask) : null);
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
