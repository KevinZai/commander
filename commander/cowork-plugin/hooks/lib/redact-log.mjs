/**
 * redact-log.mjs — scrub free text before a hook writes it to a local log.
 *
 * Runs three log-specific passes, then the plugin's shared redact() (lib/safety-snapshot.js: secret-patterns.json,
 * Bearer/Basic credentials, provider token shapes, `token=`/`password:` pairs), then clips the result:
 *   - env-style assignments whose name says secret (GITHUB_TOKEN=…, AWS_SECRET_ACCESS_KEY=…, DB_PASS="…");
 *   - quoted JSON keys that say secret ("client_secret": "…", "authorization": "…");
 *   - credential headers (Authorization:, Proxy-Authorization:, Cookie:, X-Api-Key: …) up to the end of the line.
 * The name is kept and only the value becomes [redacted], so a log row still says which variable or header failed.
 * Over-redaction is acceptable here; a leaked credential is not.
 */
import { redact } from '../../lib/safety-snapshot.js';

const SCAN_LIMIT = 16000;      // bound the regex work on a huge error before redaction
const DEFAULT_MAX = 4000;      // what is kept after redaction
const CLIP_MARK = '…[clipped]';

const ENV_SECRET = /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PASS|PWD|CREDENTIALS?|AUTH|COOKIE)[A-Z0-9_]*)(\s*=\s*)("[^"\n]*"|'[^'\n]*'|[^\s"';&|]+)/g;
const LOWER_SECRET = /\b((?:access|private|secret|client|session|api)[_-]?key|credentials?|auth[_-]?token|cookie)(\s*[=:]\s*)("[^"\n]*"|'[^'\n]*'|[^\s"';&|,}]+)/gi;
const JSON_SECRET = /("[^"\\\n]{0,60}(?:key|token|secret|passw(?:or)?d|authorization|cookie|credentials?)[^"\\\n]{0,60}"\s*:\s*)"(?:[^"\\]|\\.)*"/gi;
const HEADER_SECRET = /\b((?:proxy-)?authorization|x-api-key|api-key|x-auth-token|cookie|set-cookie)(\s*:\s*)(?!\s*")[^\r\n]+/gi;

/** Redact secrets in `value` and clip it to `max` characters. Non-strings are JSON-serialised first; null stays null. */
export function redactLogText(value, { max = DEFAULT_MAX } = {}) {
  if (value === null || value === undefined) return null;
  let text;
  if (typeof value === 'string') text = value;
  else {
    try { text = JSON.stringify(value); } catch { text = String(value); }
  }
  if (typeof text !== 'string') return null;
  if (text.length > SCAN_LIMIT) text = text.slice(0, SCAN_LIMIT);

  const scrubbed = redact(
    text
      .replace(HEADER_SECRET, '$1$2[redacted]')
      .replace(JSON_SECRET, '$1"[redacted]"')
      .replace(ENV_SECRET, '$1$2[redacted]')
      .replace(LOWER_SECRET, '$1$2[redacted]'),
  );
  if (typeof scrubbed !== 'string') return null;
  return scrubbed.length > max ? scrubbed.slice(0, max) + CLIP_MARK : scrubbed;
}
