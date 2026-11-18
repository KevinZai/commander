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
 * parent transcript's matching Agent/Task call (see claimTask). Workers that a
 * Workflow script or Code Mode program spawns have no such call and get none.
 *
 * Follows the lane's route mode (CCC_ROUTE_MODE, then config.json routeMode):
 * off and suggest stay silent; auto and always inject. CCC_SUBAGENT_ROUTE=off
 * turns off only this hook. Never blocks: any error is silent. Task text is
 * scored in memory and never logged.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { emitModel, emitSilent } from './lib/emit.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import { isMainModule } from './lib/code-mode.mjs';
import { loadRoutes, scoreRoutes, routeMode, detectHost, renderSubagentContext } from './lib/route-scorer.mjs';
import { readablePath, stateDir } from '../lib/lane-state.js';

// Claude Code's SubagentStart payload carries no task text (only session_id,
// transcript_path, cwd, agent_id, agent_type), so the task is recovered from
// the parent's transcript: the newest Agent/Task tool_use for this agent type
// that no earlier SubagentStart in this session has claimed.
const TAIL_BYTES = 512 * 1024;
const AGENT_TOOLS = new Set(['Agent', 'Task']);

function readTail(file) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const length = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, size - length);
    return buf.toString('utf8');
  } catch {
    return '';
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch {}
  }
}

/** Agent/Task tool_use blocks in transcript order: [{ id, type, text }]. */
export function agentCalls(transcriptText) {
  const calls = [];
  for (const line of String(transcriptText || '').split('\n')) {
    if (!line.includes('tool_use') || !/"(Agent|Task)"/.test(line)) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const content = entry && entry.message && Array.isArray(entry.message.content) ? entry.message.content : [];
    for (const block of content) {
      if (!block || block.type !== 'tool_use' || !AGENT_TOOLS.has(block.name) || !block.input) continue;
      const text = [block.input.description, block.input.prompt].filter((v) => typeof v === 'string' && v.trim()).join('\n');
      if (text) calls.push({ id: String(block.id || ''), type: String(block.input.subagent_type || ''), text });
    }
  }
  return calls;
}

function claimsFile(sessionId) {
  const slug = String(sessionId || 'default').replace(/[^\w-]/g, '').slice(0, 80) || 'default';
  return join(stateDir(), 'route-state', `${slug}-subagents.json`);
}

/** Pick the newest unclaimed call for this agent type and record the claim. */
export function claimTask(input = {}) {
  if (typeof input.transcript_path !== 'string' || !input.transcript_path) return '';
  const calls = agentCalls(readTail(input.transcript_path));
  if (!calls.length) return '';
  const file = claimsFile(input.session_id);
  let claimed = [];
  try { claimed = JSON.parse(readFileSync(file, 'utf8')); } catch {}
  if (!Array.isArray(claimed)) claimed = [];
  const type = String(input.agent_type || input.subagent_type || '');
  const open = calls.filter((c) => c.id && !claimed.includes(c.id));
  const pick = [...open].reverse().find((c) => !type || !c.type || c.type === type) || null;
  if (!pick) return '';
  try {
    mkdirSync(join(file, '..'), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify([...claimed, pick.id].slice(-200)));
    renameSync(tmp, file);
  } catch {}
  return pick.text;
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
