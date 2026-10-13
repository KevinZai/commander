/**
 * safety-snapshot.js
 * Static HTML snapshot renderer for the Commander "Safety" deck.
 *
 * buildSafetyHtml(model, { now }) turns the safety model
 * ({ decisions, toolFailures, generatedAt }) into ONE self-contained HTML
 * string: inline CSS, inline data, no <script>, no external URLs of any
 * kind — safe for the strict-CSP Artifact target. Emitted as a fragment
 * (<title> + <style> + terminal chrome + <main>) because the Artifact
 * publisher supplies the doctype/head/body skeleton; browsers render the
 * raw file fine too. Mirrors mission-control-snapshot.js's shape (same
 * fragment layout, same terminal-chrome wrapper, same brandBaseCss() +
 * deterministic-`now` discipline) — see that file's doc comment for the
 * fuller rationale. Reader-side utilities (toMs/defaultBaseDir/readJsonl)
 * are duplicated here on purpose, following the existing convention across
 * this lib/ tree (metrics.js, top-skills.js, suggestions.js,
 * mission-control-snapshot.js each keep their own copy) rather than
 * reaching into a sibling module for a five-line helper.
 *
 * Since v7.4.0 the markup itself lives in ./console-render.js —
 * buildSafetyHtml is a one-line delegation to buildDeckHtml(model, {tab:
 * 'safety'}), so this deck, Mission Control, Usage and the v7.4.0 console
 * render from one section renderer instead of four copies. The exported
 * signature is unchanged; equivalence is pinned byte-for-byte by
 * commander/tests/console-extraction.test.js. What remains here is the READER.
 *
 * readSafetyModel({ baseDir, now }) is a bounded, tolerant JSONL reader
 * over two logs under ~/.claude/commander/:
 *   - analytics/permission-gate.jsonl  — one row per PreToolUse gate
 *     decision: { timestamp, sessionId, decision, toolName }. `decision`
 *     is whatever string the gate hook actually wrote — this file does
 *     NOT hardcode an enum of expected values; it classifies each raw
 *     decision string into one of blocked / auto-fixed / approved / other
 *     by pattern-matching the string itself (classifyDecision below), so
 *     it stays correct if the hook's vocabulary drifts.
 *   - tool-failures.jsonl — one row per failed tool call:
 *     { ts, tool_name, error }. Aggregated into top-failing tools and a
 *     Sniffly-style top-errors list: each error is redacted (never shown
 *     raw) then normalized (paths and numbers collapsed) into a
 *     signature so near-duplicate errors — e.g. two "Exit code 143"
 *     timeouts with different durations — group into one row with a
 *     count, instead of flooding the list with one-off variants.
 *
 * Bounded read: only the last MAX_JSONL_LINES lines of each file are
 * parsed — a log that has grown past the cap silently undercounts older
 * entries rather than blowing up the build on a multi-MB file.
 *
 * Deterministic rendering: every timestamp derives from the model or the
 * `now` argument — never Date.now() inside buildSafetyHtml.
 * Zero dependencies (beyond this plugin's own lib/), ESM, read-only,
 * fail-open. Core free forever — no license check, no tier gating.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildDeckHtml } from './console-render.js';

const MAX_JSONL_LINES = 50000; // bounded-scan cap — see doc comment above
const MAX_JSONL_BYTES = 8 * 1024 * 1024; // read at most the trailing 8MB — the producer never rotates these logs
const TOP_TOOLS = 10;
const TOP_ERRORS = 10;
const SAMPLE_MAX = 240;
const SIGNATURE_MAX = 160;

function defaultBaseDir() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude', 'commander');
}

function toMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Bounded scan: only the tail maxLines non-empty lines are parsed. Mirrors
// mission-control-snapshot.js's readJsonl() — duplicated per this file's
// own doc-comment rationale (small, self-contained, no cross-import).
// Read at most the trailing maxBytes of a file. Keeps an unrotated,
// ever-growing append-only log from being slurped whole into memory. The
// leading line of the window may be partial (the cut can land mid-record) —
// that's left as-is on purpose: readJsonl's JSON.parse tolerance drops an
// unparseable partial line, while a record that begins exactly at the byte
// boundary is preserved rather than being wrongly discarded.
async function readTailText(filePath, maxBytes = MAX_JSONL_BYTES) {
  let handle;
  try {
    handle = await fsp.open(filePath, 'r');
  } catch {
    return '';
  }
  try {
    const { size } = await handle.stat();
    if (size <= maxBytes) return await handle.readFile('utf8');
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buf, 0, maxBytes, size - maxBytes);
    return buf.toString('utf8', 0, bytesRead);
  } catch {
    return '';
  } finally {
    await handle.close();
  }
}

async function readJsonl(filePath, maxLines = MAX_JSONL_LINES) {
  const raw = await readTailText(filePath, MAX_JSONL_BYTES);
  if (!raw) return [];

  const lines = raw.split('\n').filter((line) => line.trim());
  const tail = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;

  const entries = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

// Same redact() pattern set used across this plugin's hooks (see
// hooks/mission-control-feed.js, hooks/task-tracker.js,
// hooks/subagent-start-tracker.js) — duplicated here rather than imported
// so this lib file has no runtime dependency on hooks/.
//
// Basic-auth redaction is SHAPE-based, not context- or length-based: match
// `Basic <token>` anywhere (quoted, JSON, raw, or after Authorization/
// Proxy-Authorization) and redact ONLY when the token base64-decodes to a
// string containing ":". Real Basic credentials are base64("user:pass") and
// always contain a colon; English words after "Basic" (e.g. "Basic
// authentication failed") decode to non-colon bytes and are left alone. This
// replaced an earlier context-anchored matcher that leaked quoted/serialized
// forms, and a length-based one that both missed short creds and over-redacted
// prose. The remaining `authorization: <scheme>` matcher covers the other
// multi-token schemes; AKIA covers AWS access-key ids.
// The full pattern library (JWTs, Google AIza keys, Stripe, SendGrid, private-key
// headers…) lives in secret-patterns.json and was previously consumed ONLY by
// secret-leak-guard.js — so a JWT could ride an error sample into a published
// artifact untouched (2026-07-28 security audit). Compile it once here too.
// JSON regexes may carry a Python-style `(?i)` inline flag JS rejects: strip it
// and set the 'i' flag instead. A pattern that still fails to compile is skipped
// (never let one bad vendor pattern take down the whole redactor).
// This file is ESM — require() is unavailable, so read the JSON synchronously
// relative to this module. (A silent `require` failure here was caught by the
// regression tests: the catch swallowed it and the pattern list became [].)
const EXTRA_SECRET_PATTERNS = (() => {
  try {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const lib = JSON.parse(
      fs.readFileSync(path.join(here, 'secret-patterns.json'), 'utf8')
    );
    return (lib.patterns || [])
      .map((p) => {
        try {
          const insensitive = p.regex.startsWith('(?i)');
          const source = insensitive ? p.regex.slice(4) : p.regex;
          return new RegExp(source, insensitive ? 'gi' : 'g');
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
})();

function redact(value) {
  if (typeof value !== 'string') return null;
  let out = value;
  for (const re of EXTRA_SECRET_PATTERNS) {
    out = out.replace(re, '[redacted]');
  }
  return out
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/\b(basic)\s+([A-Za-z0-9+/]{4,}={0,2})/gi, (match, scheme, b64) => {
      try {
        return Buffer.from(b64, 'base64').toString('utf8').includes(':') ? `${scheme} [redacted]` : match;
      } catch {
        return match;
      }
    })
    .replace(/(authorization\s*[=:]\s*)(?:bearer|digest|negotiate|token)\s+[^\s"']+/gi, '$1[redacted]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[redacted]')
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, '[redacted]')
    .replace(/hf_[A-Za-z0-9]{16,}/g, '[redacted]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(
      /((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[=:]\s*)\S+/gi,
      '$1[redacted]'
    );
}

// Classifies a raw permission-gate `decision` string into a display kind.
// Pattern-matched against the string itself rather than an enum, so a new
// decision value the gate hook starts writing still lands in a sane bucket
// instead of silently falling out of the hero counts.
//
// Order matters, and it is the OPPOSITE of what the name might suggest:
// `rejected-autofix` is what permission-gate.js logs when it DENIES an
// autofix write (CCC_AUTOFIX_APPROVED !== '1') — the write did NOT happen,
// so it is a BLOCK, not an applied fix. A rejection/denial pattern is
// therefore matched BEFORE the bare-autofix pattern, so a denied autofix
// counts as blocked. The "auto-fixed" bucket is reserved for a genuine
// applied fix (a future `auto-fixed` / `approved-autofix` decision).
function classifyDecision(decision) {
  const raw = typeof decision === 'string' && decision.trim() ? decision.trim() : 'unknown';
  if (/(?:reject|deny|denied|block).*autofix|autofix.*(?:reject|deny|denied|block)/i.test(raw))
    return { kind: 'blocked', label: 'blocked (autofix needs approval)' };
  if (/auto-?fixed|autofix-applied|approved-autofix/i.test(raw)) return { kind: 'autofixed', label: 'auto-fixed' };
  if (/danger/i.test(raw)) return { kind: 'blocked', label: 'blocked (dangerous)' };
  if (/reject|deny|denied|block/i.test(raw)) return { kind: 'blocked', label: 'blocked' };
  if (/approve/i.test(raw)) return { kind: 'approved', label: 'approved' };
  return { kind: 'other', label: raw };
}

// Redact, collapse whitespace, then fold out volatile bits (absolute
// paths, digit runs) so structurally-identical errors with different
// paths/exit-codes/durations/timestamps group under one signature. The
// unfolded (but still redacted) text is kept separately as the display
// sample — normalization is only ever used as the grouping key.
function normalizeErrorSignature(rawError) {
  const redacted = redact(rawError);
  if (redacted === null || !redacted.trim()) return '(no error text)';
  const collapsed = redacted.replace(/\s+/g, ' ').trim();
  const noPaths = collapsed.replace(/(?:~|\/)[\w.@-]+(?:\/[\w.@-]+)+/g, '<path>');
  const noNumbers = noPaths.replace(/\d+/g, '#');
  return noNumbers.length > SIGNATURE_MAX ? `${noNumbers.slice(0, SIGNATURE_MAX - 3)}...` : noNumbers;
}

function redactedSample(rawError) {
  const redacted = redact(rawError);
  if (redacted === null) return '(no error text)';
  // Fold home-dir paths in DISPLAY samples too, not just grouping signatures —
  // "/Users/<name>/…" in a published artifact leaks the machine's username
  // (2026-07-28 security audit). Keep the leaf segment for debuggability.
  const noHome = redacted.replace(
    /(?:\/(?:Users|home)\/)[\w.@-]+((?:\/[\w.@-]+)*)/g,
    (_m, rest) => `<home>${rest}`
  );
  // FLATTENED form: Claude Code's project-dir naming turns "/Users/kevin/…"
  // into "-Users-kevin-…" (slashes → dashes), which the fold above never
  // matches — it requires a literal "/". Fold that shape too (CC-1397).
  const noFlattenedHome = noHome.replace(/-(?:Users|home)-[\w.@-]+/g, '<home>');
  const collapsed = noFlattenedHome.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '(no error text)';
  return collapsed.length > SAMPLE_MAX ? `${collapsed.slice(0, SAMPLE_MAX - 3)}...` : collapsed;
}

function aggregateDecisions(gateRows) {
  const decisionCounts = new Map();
  for (const row of gateRows) {
    const decision =
      row && typeof row.decision === 'string' && row.decision.trim() ? row.decision.trim() : 'unknown';
    decisionCounts.set(decision, (decisionCounts.get(decision) || 0) + 1);
  }

  const counts = [...decisionCounts.entries()]
    .map(([decision, count]) => {
      const { kind, label } = classifyDecision(decision);
      return { decision, label, kind, count };
    })
    .sort((left, right) => right.count - left.count);

  let blocked = 0;
  let autofixed = 0;
  let approved = 0;
  let otherCount = 0;
  for (const entry of counts) {
    if (entry.kind === 'blocked') blocked += entry.count;
    else if (entry.kind === 'autofixed') autofixed += entry.count;
    else if (entry.kind === 'approved') approved += entry.count;
    else otherCount += entry.count;
  }

  return {
    total: counts.reduce((sum, entry) => sum + entry.count, 0),
    counts,
    blocked,
    autofixed,
    approved,
    otherCount,
  };
}

function aggregateToolFailures(failureRows) {
  const toolCounts = new Map();
  const errorCounts = new Map();

  for (const row of failureRows) {
    const tool =
      row && typeof row.tool_name === 'string' && row.tool_name.trim() ? row.tool_name.trim() : 'unknown';
    toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);

    const rawError = row && typeof row.error === 'string' ? row.error : '';
    const signature = normalizeErrorSignature(rawError);
    const existing = errorCounts.get(signature);
    if (existing) {
      existing.count += 1;
    } else {
      errorCounts.set(signature, { count: 1, sample: redactedSample(rawError) });
    }
  }

  const byTool = [...toolCounts.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, TOP_TOOLS);

  const topErrors = [...errorCounts.entries()]
    .map(([signature, value]) => ({ signature, count: value.count, sample: value.sample }))
    .sort((left, right) => right.count - left.count)
    .slice(0, TOP_ERRORS);

  return {
    total: failureRows.length,
    byTool,
    topErrors,
  };
}

async function readSafetyModel({ baseDir, now } = {}) {
  const root = baseDir || defaultBaseDir();

  const [gateRows, failureRows] = await Promise.all([
    readJsonl(path.join(root, 'analytics', 'permission-gate.jsonl')),
    readJsonl(path.join(root, 'tool-failures.jsonl')),
  ]);

  const nowMs = toMs(now) ?? Date.now();

  // dataThrough (v7.3.0, Item 6): newest source-row timestamp across this
  // deck's own two logs — permission-gate.jsonl's `timestamp` field and
  // tool-failures.jsonl's `ts` field (both real ISO timestamps, unlike
  // usage-snapshot.js's day-bucketed sources).
  let dataThroughMs = null;
  for (const row of gateRows) {
    const ms = row && typeof row === 'object' ? toMs(row.timestamp) : null;
    if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
  }
  for (const row of failureRows) {
    const ms = row && typeof row === 'object' ? toMs(row.ts) : null;
    if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
  }
  const hasAnySourceRow = gateRows.length > 0 || failureRows.length > 0;

  return {
    decisions: aggregateDecisions(gateRows),
    toolFailures: aggregateToolFailures(failureRows),
    dataThroughMs,
    hasAnySourceRow,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

// The deck page — chrome, CSS, and every section — is rendered by
// ./console-render.js. This wrapper exists so the skill-facing entry point and
// its signature are unchanged.
function buildSafetyHtml(model, { now } = {}) {
  return buildDeckHtml(model, { tab: 'safety', surface: 'artifact', now });
}

// redact/redactedSample exported so their behaviour is pinned by tests instead of
// re-verified by hand each audit (same lesson as the contract patcher).
export { buildSafetyHtml, readSafetyModel, redact, redactedSample };
