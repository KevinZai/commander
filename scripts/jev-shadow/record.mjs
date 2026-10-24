// CC-1594 Jev shadow harness: event normalization + redaction. Offline, no deps.
export const KINDS = ['permission', 'route', 'loop'];

// Order matters: multi-line and highly specific shapes first, the broad generic
// key/value catch-all last. Every replacement is idempotent (redact(redact(x)) === redact(x)).
const PATTERNS = [
  // PEM private-key blocks; an unterminated block is redacted to the end of the string.
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED_PRIVATE_KEY]'],
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]'],
  [/(?:AKIA|ASIA)[A-Z0-9]{16}/g, '[REDACTED_AWS_KEY]'],
  [/[sr]k_(?:live|test)_[A-Za-z0-9]{8,}/g, '[REDACTED_KEY]'],
  [/xox[abprs]-[A-Za-z0-9-]{8,}/g, '[REDACTED_TOKEN]'],
  [/github_pat_[A-Za-z0-9_]{8,}/g, '[REDACTED_TOKEN]'],
  [/npm_[A-Za-z0-9]{20,}/g, '[REDACTED_TOKEN]'],
  [/sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED_KEY]'],
  [/gh[pousr]_[A-Za-z0-9]{8,}/g, '[REDACTED_TOKEN]'],
  [/lin_api_[A-Za-z0-9]{8,}/g, '[REDACTED_TOKEN]'],
  [/Authorization(\s*:\s*)Basic\s+\S+/gi, 'Authorization$1Basic [REDACTED]'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]'],
  // Generic catch-all: name=value / name: value (value may be quoted). Keeps the name and separator.
  [/(key|token|secret|password|passwd|api[_-]?key)(["']?\s*[=:]\s*)(?!\[REDACTED)(?:"[^"]*"|'[^']*'|\S+)/gi, '$1$2[REDACTED]'],
];

export function redact(str) {
  let out = String(str ?? '');
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out;
}

export function normalizeEvent({ ts, kind, input, incumbentDecision } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`invalid kind: ${redact(kind)}`);
  if (typeof incumbentDecision !== 'string' || !incumbentDecision) {
    throw new Error('incumbentDecision must be a non-empty string');
  }
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid ts: ${redact(ts)}`);
  return {
    ts: date.toISOString(),
    kind,
    input: redact(typeof input === 'string' ? input : JSON.stringify(input ?? '')),
    incumbentDecision: redact(incumbentDecision),
  };
}
