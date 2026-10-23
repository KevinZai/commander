// Offline anonymous skill-event payload builder (CC-361 slice 1).
// Pure functions only: no network, no filesystem, no process globals.
// Callers pass env/config in, so opt-out behavior is fully testable.

export const SKILL_EVENT_NAME = 'skill_invoked';
export const SKILL_EVENT_SCHEMA = 1;

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/;
const SURFACES = new Set(['cli', 'plugin', 'cowork', 'codex', 'unknown']);
const TRUTHY_DNT = new Set(['1', 'true', 'yes']);

// True when the user has opted out via env (CCC_TELEMETRY=0, DO_NOT_TRACK) or config.telemetry === false.
export function isSkillTelemetryOptedOut(env = {}, config = {}) {
  if (env.CCC_TELEMETRY === '0') return true;
  if (TRUTHY_DNT.has(String(env.DO_NOT_TRACK || '').toLowerCase())) return true;
  if (config && config.telemetry === false) return true;
  return false;
}

// Returns a payload object, or null when opted out or the input is not a safe skill name.
// Only the allowlisted fields below ever leave this function; extra input is dropped.
export function buildSkillEvent(input = {}, { env = {}, config = {} } = {}) {
  if (isSkillTelemetryOptedOut(env, config)) return null;
  const { skill, anonId, version, surface, os } = input || {};
  if (typeof skill !== 'string' || !SKILL_NAME_PATTERN.test(skill)) return null;
  if (typeof anonId !== 'string' || !anonId) return null;
  return {
    event: SKILL_EVENT_NAME,
    schema: SKILL_EVENT_SCHEMA,
    anon_id: anonId,
    properties: {
      skill,
      version: typeof version === 'string' ? version.slice(0, 32) : 'unknown',
      surface: SURFACES.has(surface) ? surface : 'unknown',
      os: typeof os === 'string' ? os.slice(0, 16) : 'unknown',
    },
  };
}
