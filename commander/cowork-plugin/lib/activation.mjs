// activation.mjs — first-run detection and the once-only `first_result` signal.
//
// State lives in the lane's Commander state file (<config dir>/commander/state.json,
// read from the legacy ~/.claude/commander copy until the lane writes its own),
// the same file /ccc-start and the /ccc onboarding gate use. Recording a first
// result always writes that local file; the `first_result` telemetry event is
// queued only when the user has opted in (lib/network-mode.js decides). With
// telemetry off nothing leaves the machine.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lane = require('./lane-state.js');
const network = require('./network-mode.js');

/** Flagship skills that can produce an install's first finished result. */
export const FLAGSHIPS = Object.freeze(['ccc-start', 'ccc-xray', 'ccc-plan', 'ccc-build', 'ccc-review', 'ccc-ship']);

const STATE_REL = 'state.json';

export function statePaths(env = process.env) {
  return { read: lane.readablePath(STATE_REL, env), write: path.join(lane.stateDir(env), STATE_REL) };
}

export function readState(env = process.env) {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePaths(env).read, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return null;
  }
}

function writeState(state, env) {
  const file = statePaths(env).write;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
  return file;
}

/**
 * First run = no Commander state yet, or state without a completed onboarding
 * and without a recorded first result. `stamp` records firstRunAt once so the
 * first result can report how long it took.
 */
export function detectFirstRun({ env = process.env, stamp = false, now = new Date() } = {}) {
  const existing = readState(env);
  const state = existing || {};
  const firstRun = !state.onboardingCompleted && !state.firstResultAt;
  if (stamp && firstRun && !state.firstRunAt) {
    state.firstRunAt = now.toISOString();
    writeState(state, env);
  }
  return {
    first_run: firstRun,
    state_exists: existing !== null,
    onboarding_completed: !!state.onboardingCompleted,
    first_result: state.firstResultAt ? { skill: state.firstResultSkill || null, at: state.firstResultAt } : null,
    telemetry: network.isTelemetryEnabled(env),
  };
}

export function markOnboardingComplete({ env = process.env, now = new Date() } = {}) {
  const state = readState(env) || {};
  state.onboardingCompleted = true;
  state.completedAt = now.toISOString();
  return writeState(state, env);
}

/**
 * Record the install's first finished result. Returns { recorded, sent, ... }.
 * `recorded` is false when one was already recorded (the event fires once).
 * `track` is injected for tests; by default the opt-in telemetry client.
 */
export async function recordFirstResult(skill, { env = process.env, via = null, now = new Date(), track = null } = {}) {
  if (!FLAGSHIPS.includes(skill)) throw new Error(`not a flagship skill: ${skill}`);
  const state = readState(env) || {};
  if (state.firstResultAt) {
    return { recorded: false, sent: false, skill: state.firstResultSkill || null, at: state.firstResultAt };
  }
  state.firstResultAt = now.toISOString();
  state.firstResultSkill = skill;
  writeState(state, env);

  const props = { skill };
  if (via && FLAGSHIPS.includes(via)) props.via = via;
  const started = Date.parse(state.firstRunAt || '');
  if (Number.isFinite(started) && now.getTime() >= started) props.seconds_since_first_run = Math.round((now.getTime() - started) / 1000);

  let sent = false;
  if (network.isTelemetryEnabled(env)) {
    const send = track || (await import('./telemetry.mjs')).track;
    await send('first_result', props);
    sent = true;
  }
  return { recorded: true, sent, skill, at: state.firstResultAt, properties: props };
}
