// CC-1594 Jev shadow harness: event normalization + redaction. Offline, no deps.
export const KINDS = ['permission', 'route', 'loop'];

const PATTERNS = [
  [/sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED_KEY]'],
  [/gh[pousr]_[A-Za-z0-9]{8,}/g, '[REDACTED_TOKEN]'],
  [/lin_api_[A-Za-z0-9]{8,}/g, '[REDACTED_TOKEN]'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]'],
];

export function redact(str) {
  let out = String(str ?? '');
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out;
}

export function normalizeEvent({ ts, kind, input, incumbentDecision } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`invalid kind: ${kind}`);
  if (typeof incumbentDecision !== 'string' || !incumbentDecision) {
    throw new Error('incumbentDecision must be a non-empty string');
  }
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid ts: ${ts}`);
  return {
    ts: date.toISOString(),
    kind,
    input: redact(typeof input === 'string' ? input : JSON.stringify(input ?? '')),
    incumbentDecision: redact(incumbentDecision),
  };
}
