/**
 * redact-log.mjs — scrub free text before a hook writes it to a local log.
 *
 * Runs three log-specific passes, then the plugin's shared redact() (lib/safety-snapshot.js: secret-patterns.json,
 * Bearer/Basic credentials, provider token shapes, `token=`/`password:` pairs), then clips the result:
 *   - env-style assignments whose name says secret (GITHUB_TOKEN=…, AWS_SECRET_ACCESS_KEY=…, DB_PASS="…");
 *   - quoted JSON keys that say secret ("client_secret": "…", "authorization": "…");
 *   - credential headers (Authorization:, Proxy-Authorization:, Cookie:, X-Api-Key: …) up to the end of the line.
 * A value may be quoted across lines, unterminated (redacted to the end), or a [list] / shell (array) of values; the
 * whole input is redacted before it is clipped, so a secret that straddles the clip point never survives.
 * A structured value is first redacted by key (any value under a secret-named key), then serialised.
 * The name is kept and only the value becomes [redacted], so a log row still says which variable or header failed.
 * Over-redaction is acceptable here; a leaked credential is not.
 */
import { redact } from '../../lib/safety-snapshot.js';

// The whole text is redacted before it is clipped, so a secret can never survive because it straddled a cut. Only
// input past MAX_INPUT (far more than any tool error) is dropped first; a quoted value cut there runs to the end of
// the text and is redacted as unterminated. Name parts are length-bounded so the scan stays linear.
const MAX_INPUT = 256 * 1024;
const DEFAULT_MAX = 4000;      // what is kept after redaction
const CLIP_MARK = '…[clipped]';

// A secret's value: a double-quoted string (escapes and line breaks allowed; unterminated runs to the end), a
// single-quoted string (same), a [list] or a shell (array), or a bare token.
const DQ = String.raw`"(?:[^"\\]|\\[\s\S])*(?:"|$)`;
const SQ = String.raw`'[^']*(?:'|$)`;
const LIST = String.raw`\[(?:[^\[\]"']|"(?:[^"\\]|\\[\s\S])*"|'[^']*')*(?:\]|$)|\([^)]*(?:\)|$)`;
const ENV_SECRET = new RegExp(String.raw`\b([A-Z][A-Z0-9_]{0,60}(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PASS|PWD|CREDENTIALS?|AUTH|COOKIE)S?[A-Z0-9_]{0,60})(\s*=\s*)(${DQ}|${SQ}|${LIST}|[^\s"';&|]+)`, 'g');
const LOWER_SECRET = new RegExp(String.raw`\b((?:access|private|secret|client|session|api)[_-]?keys?|credentials?|auth[_-]?tokens?|cookies?)(\s*[=:]\s*)(${DQ}|${SQ}|${LIST}|[^\s"';&|,}]+)`, 'gi');
// A dotted or plain identifier that names secrets, assigned a list: config.passwords = ['a', 'b'].
const LIST_SECRET = new RegExp(String.raw`\b([A-Za-z_][\w.-]{0,60}?(?:passw(?:or)?ds?|secrets?|tokens?|api[_-]?keys?|credentials?))(\s*[=:]\s*)(${LIST})`, 'gi');
const JSON_KEY = String.raw`"[^"\\\n]{0,60}(?:key|token|secret|passw(?:or)?d|authorization|cookie|credentials?)[^"\\\n]{0,60}"\s*:\s*`;
const JSON_SECRET = new RegExp(String.raw`(${JSON_KEY})(${DQ}|${LIST})`, 'gi');
const HEADER_SECRET = /\b((?:proxy-)?authorization|x-api-key|api-key|x-auth-token|cookie|set-cookie)(\s*:\s*)(?!\s*")[^\r\n]+/gi;

// A structured value is redacted by key before it is serialised: a key that names a secret has its whole value
// replaced, whatever its type, so an object-valued credential or a nested array of passwords never reaches the
// text passes, which only see flat string and list values (Codex #302 delta3 P1).
const SECRET_KEY = /key|token|secret|passw(?:or)?d|authorization|cookie|credentials?/i;
const MAX_DEPTH = 64;

function redactKeys(value, seen = new WeakSet(), depth = 0) {
  if (value !== null && typeof value === 'object' && typeof value.toJSON === 'function') {
    try { value = value.toJSON(); } catch { return '[unserialisable]'; }
  }
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  if (depth >= MAX_DEPTH) return '[truncated]';
  seen.add(value);
  let out;
  if (Array.isArray(value)) out = value.map((item) => redactKeys(item, seen, depth + 1));
  else {
    out = {};
    for (const key of Object.keys(value)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redactKeys(value[key], seen, depth + 1);
    }
  }
  seen.delete(value);
  return out;
}

const asRedacted = (value) => (value.startsWith('[') ? '["[redacted]"]' : value.startsWith('(') ? '([redacted])' : value.startsWith('"') ? '"[redacted]"' : '[redacted]');

/** Redact secrets in `value` and clip it to `max` characters. Non-strings are JSON-serialised first; null stays null. */
export function redactLogText(value, { max = DEFAULT_MAX } = {}) {
  if (value === null || value === undefined) return null;
  let text;
  if (typeof value === 'string') text = value;
  else {
    try { text = JSON.stringify(redactKeys(value)); } catch { text = String(value); }
  }
  if (typeof text !== 'string') return null;
  if (text.length > MAX_INPUT) text = text.slice(0, MAX_INPUT);

  const scrubbed = redact(
    text
      .replace(HEADER_SECRET, '$1$2[redacted]')
      .replace(JSON_SECRET, (_m, key, value) => key + asRedacted(value))
      .replace(ENV_SECRET, '$1$2[redacted]')
      .replace(LIST_SECRET, '$1$2[redacted]')
      .replace(LOWER_SECRET, '$1$2[redacted]'),
  );
  if (typeof scrubbed !== 'string') return null;
  return scrubbed.length > max ? scrubbed.slice(0, max) + CLIP_MARK : scrubbed;
}
