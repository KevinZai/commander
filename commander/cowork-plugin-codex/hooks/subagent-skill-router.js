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
 * Follows the lane's route mode (CCC_ROUTE_MODE, then config.json routeMode):
 * off and suggest stay silent; auto and always inject. CCC_SUBAGENT_ROUTE=off
 * turns off only this hook. Never blocks: any error is silent. Task text is
 * scored in memory and never logged.
 */
import { readFileSync } from 'node:fs';
import { emitModel, emitSilent } from './lib/emit.mjs';
import { readStdinJson } from './lib/session-key.mjs';
import { isMainModule } from './lib/code-mode.mjs';
import { loadRoutes, scoreRoutes, routeMode, detectHost, renderSubagentContext } from './lib/route-scorer.mjs';
import { readablePath } from '../lib/lane-state.js';

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
    const text = taskText(input);
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
