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
 * fuller rationale. Small utilities (esc/toMs/stamp/timeAgo/
 * defaultBaseDir/readJsonl) are duplicated here on purpose, following the
 * existing convention across this lib/ tree (metrics.js, top-skills.js,
 * suggestions.js, mission-control-snapshot.js each keep their own copy)
 * rather than reaching into a sibling module for a five-line helper.
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
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { brandBaseCss } from './brand-css.js';
import { deckStripCss, deckStripHtml } from './deck-switcher.js';

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
// Read at most the trailing maxBytes of a file, dropping the first (likely
// partial) line so callers only ever see whole lines. Keeps an unrotated,
// ever-growing append-only log from being slurped whole into memory.
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
    await handle.read(buf, 0, maxBytes, size - maxBytes);
    const text = buf.toString('utf8');
    const nl = text.indexOf('\n');
    return nl >= 0 ? text.slice(nl + 1) : text;
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
// so this lib file has no runtime dependency on hooks/. Basic-auth and AWS
// AKIA patterns were added after an adversarial review found a
// `Authorization: Basic <base64>` credential surviving redaction (the
// keyword pattern below only redacts a single token after the colon, so it
// stripped "Basic" and left the base64 payload).
function redact(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/Basic\s+[A-Za-z0-9+/=]{12,}/gi, '[redacted]')
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
  const collapsed = redacted.replace(/\s+/g, ' ').trim();
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

  return {
    decisions: aggregateDecisions(gateRows),
    toolFailures: aggregateToolFailures(failureRows),
    generatedAt: new Date(nowMs).toISOString(),
  };
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stamp(ms) {
  if (!Number.isFinite(ms)) return '';
  return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function pct(count, total) {
  if (!Number.isFinite(total) || total <= 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

// CCC brand mapping (commanderplugin.com design system, via ./brand-css.js)
// — same --sf-* forwarding pattern mission-control-snapshot.js uses for
// its --mc-* tokens: one unconditional block that resolves against
// whichever theme brandBaseCss() has active, so light/dark/data-theme
// switching needs no per-theme duplication here.
const SAFETY_CSS = `
:root{
  --sf-bg:var(--bg);--sf-card:var(--bg-card);--sf-fg:var(--text);--sf-muted:var(--text-dim);
  --sf-line:var(--border);--sf-accent:var(--primary);
  --sf-ok:var(--green-dot);--sf-ok-bg:color-mix(in srgb,var(--green-dot) 16%,transparent);
  --sf-err:var(--red);--sf-err-bg:color-mix(in srgb,var(--red) 16%,transparent);
  --sf-warn:var(--yellow);--sf-warn-bg:color-mix(in srgb,var(--yellow) 18%,transparent);
}
body{margin:0;background:var(--sf-bg);color:var(--sf-fg);}
.sf-shell{max-width:1080px;margin:20px auto 40px;}
.sf-shell .terminal-title{letter-spacing:0.03em;}
.safety{padding:20px 16px 40px;
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--sf-fg);}
.safety *{box-sizing:border-box;}
.safety h1{font-size:1.45rem;margin:0 0 2px;}
.safety h2{font-size:1.02rem;margin:0 0 10px;}
.safety .stamp{color:var(--sf-muted);margin:0 0 18px;font-size:.86rem;}
.safety section{background:var(--sf-card);border:1px solid var(--sf-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.safety .zero{color:var(--sf-muted);margin:0;}
.safety .scroll{overflow-x:auto;}
.safety .muted{color:var(--sf-muted);}
.safety .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;}
.safety .hero-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;}
.safety .hero-stat{border:1px solid var(--sf-line);border-radius:10px;padding:14px 14px 12px;text-align:center;}
.safety .hero-stat .num{font-size:1.9rem;font-weight:700;line-height:1.1;}
.safety .hero-stat .lbl{color:var(--sf-muted);font-size:.82rem;margin-top:4px;}
.safety .hero-stat.blocked .num{color:var(--sf-err);}
.safety .hero-stat.autofixed .num{color:var(--sf-warn);}
.safety .hero-stat.approved .num{color:var(--sf-ok);}
.safety .hero-headline{font-size:1.06rem;margin:0 0 14px;}
.safety .badge{display:inline-block;border-radius:999px;padding:1px 9px;
  font-size:.78rem;font-weight:600;white-space:nowrap;}
.safety .bd-blocked{color:var(--sf-err);background:var(--sf-err-bg);}
.safety .bd-autofixed{color:var(--sf-warn);background:var(--sf-warn-bg);}
.safety .bd-approved{color:var(--sf-ok);background:var(--sf-ok-bg);}
.safety .bd-other{color:var(--sf-muted);background:var(--sf-line);}
.safety .bar-row{display:grid;grid-template-columns:140px 1fr auto;gap:10px;align-items:center;
  padding:5px 0;font-size:.86rem;}
.safety .bar-row .bar-label{overflow-wrap:anywhere;}
.safety .bar-track{background:var(--sf-line);border-radius:5px;height:9px;overflow:hidden;}
.safety .bar-fill{height:100%;background:var(--sf-accent);border-radius:5px;}
.safety .bar-fill.err{background:var(--sf-err);}
.safety .bar-row .bar-count{color:var(--sf-muted);text-align:right;white-space:nowrap;}
.safety ul,.safety ol{margin:0;padding-left:0;list-style:none;}
.safety li{padding:7px 0;border-bottom:1px solid var(--sf-line);overflow-wrap:anywhere;}
.safety li:last-child{border-bottom:none;}
.safety .error-sig{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;
  display:block;margin-top:2px;color:var(--sf-muted);}
.safety .decision-table{width:100%;border-collapse:collapse;font-size:.9rem;}
.safety .decision-table th{text-align:left;color:var(--sf-muted);font-weight:600;
  border-bottom:1px solid var(--sf-line);padding:6px 12px 6px 0;white-space:nowrap;}
.safety .decision-table td{border-bottom:1px solid var(--sf-line);padding:7px 12px 7px 0;vertical-align:top;}
.safety .decision-table tr:last-child td{border-bottom:none;}
.safety footer{color:var(--sf-muted);font-size:.82rem;text-align:center;}
@media (max-width:560px){
  .safety{padding:16px 10px 32px;}
  .safety section{padding:12px;}
  .safety .bar-row{grid-template-columns:110px 1fr auto;}
}
`;

// Terminal-window chrome wraps the whole board, matching Mission
// Control's `.terminal-chrome` component and commanderplugin.com's
// terminal look. Deterministic, CSP-safe (no <script>).
function renderTerminalChromeOpen() {
  return `<div class="terminal-chrome sf-shell">
<div class="terminal-header">
<span class="terminal-dot red" aria-hidden="true"></span><span class="terminal-dot yellow" aria-hidden="true"></span><span class="terminal-dot green" aria-hidden="true"></span>
<span class="terminal-title">commander &middot; safety</span>
</div>`;
}

const TERMINAL_CHROME_CLOSE = '</div>';

function renderHeroSection(decisions) {
  const { total, blocked, autofixed, approved, otherCount } = decisions;

  if (total === 0) {
    return `<section aria-label="Safety overview">
<h2>🛡️ Safety overview</h2>
<p class="zero">No permission-gate telemetry yet — Commander hasn't logged any tool-permission decisions on this machine.</p>
</section>`;
  }

  // `blocked` aggregates dangerous-command blocks AND denied-autofix writes,
  // so the headline says "action(s)", not "dangerous action(s)". The
  // auto-fixed clause is only shown when a genuine applied fix exists —
  // "auto-fixed 0 for you" is noise (and, before the classifier fix, was
  // actively wrong: denied autofixes were miscounted here).
  const headlineParts = [];
  headlineParts.push(
    `Commander blocked <strong>${esc(blocked)}</strong> action${blocked === 1 ? '' : 's'}`
  );
  if (autofixed > 0) headlineParts.push(`auto-fixed <strong>${esc(autofixed)}</strong> for you`);
  const headline = `${headlineParts.join(' and ')}. <strong>${esc(approved)}</strong> tool call${approved === 1 ? '' : 's'} approved without intervention${otherCount > 0 ? ` (${esc(otherCount)} other decision${otherCount === 1 ? '' : 's'})` : ''}.`;

  return `<section aria-label="Safety overview">
<h2>🛡️ Safety overview</h2>
<p class="hero-headline">${headline}</p>
<div class="hero-grid">
<div class="hero-stat blocked"><div class="num">${esc(blocked)}</div><div class="lbl">blocked</div></div>
<div class="hero-stat autofixed"><div class="num">${esc(autofixed)}</div><div class="lbl">auto-fixed</div></div>
<div class="hero-stat approved"><div class="num">${esc(approved)}</div><div class="lbl">approved</div></div>
</div>
</section>`;
}

function renderToolFailuresSection(toolFailures) {
  const { total, byTool, topErrors } = toolFailures;

  if (total === 0) {
    return `<section aria-label="Tool failure hotspots">
<h2>⚠ Tool failure hotspots</h2>
<p class="zero">No tool failures logged yet.</p>
</section>`;
  }

  const maxToolCount = byTool.reduce((max, entry) => Math.max(max, entry.count), 0) || 1;
  const toolRows = byTool
    .map(
      (entry) => `<div class="bar-row">
<span class="bar-label mono">${esc(entry.tool)}</span>
<span class="bar-track"><span class="bar-fill err" style="width:${Math.max(4, Math.round((entry.count / maxToolCount) * 100))}%"></span></span>
<span class="bar-count">${esc(entry.count)}</span>
</div>`
    )
    .join('');

  const errorItems = topErrors
    .map(
      (entry) => `<li>
<span>${esc(entry.count)}&times; <span class="mono">${esc(entry.sample)}</span></span>
<span class="error-sig">${esc(entry.signature)}</span>
</li>`
    )
    .join('');

  return `<section aria-label="Tool failure hotspots">
<h2>⚠ Tool failure hotspots</h2>
<p class="muted">${esc(total)} failure${total === 1 ? '' : 's'} logged across ${esc(byTool.length)} tool${byTool.length === 1 ? '' : 's'} shown.</p>
<h3 class="muted" style="margin:14px 0 6px;font-size:.84rem;">Top failing tools</h3>
${toolRows}
<h3 class="muted" style="margin:16px 0 6px;font-size:.84rem;">Top recurring errors</h3>
<ul>${errorItems}</ul>
</section>`;
}

function renderDecisionsSection(decisions) {
  const { total, counts } = decisions;

  if (total === 0) {
    return `<section aria-label="Permission decisions">
<h2>🔐 Permission decisions</h2>
<p class="zero">No permission-gate telemetry yet.</p>
</section>`;
  }

  const badgeClass = { blocked: 'bd-blocked', autofixed: 'bd-autofixed', approved: 'bd-approved', other: 'bd-other' };
  const rows = counts
    .map(
      (entry) => `<tr>
<td><span class="badge ${badgeClass[entry.kind] || 'bd-other'}">${esc(entry.label)}</span></td>
<td class="mono">${esc(entry.decision)}</td>
<td class="mono">${esc(entry.count)}</td>
<td class="mono">${esc(pct(entry.count, total))}</td>
</tr>`
    )
    .join('');

  return `<section aria-label="Permission decisions">
<h2>🔐 Permission decisions</h2>
<div class="scroll"><table class="decision-table">
<thead><tr><th>Category</th><th>Raw decision</th><th>Count</th><th>Share</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
</section>`;
}

function buildSafetyHtml(model, { now } = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const decisions =
    source.decisions && typeof source.decisions === 'object'
      ? source.decisions
      : { total: 0, counts: [], blocked: 0, autofixed: 0, approved: 0, otherCount: 0 };
  const toolFailures =
    source.toolFailures && typeof source.toolFailures === 'object'
      ? source.toolFailures
      : { total: 0, byTool: [], topErrors: [] };
  const nowMs = toMs(now) ?? toMs(source.generatedAt);

  return `<meta charset="utf-8">
<title>Commander Safety</title>
<style>${brandBaseCss()}${deckStripCss()}${SAFETY_CSS}</style>
${renderTerminalChromeOpen()}
<main class="safety">
${deckStripHtml('safety', { interactive: false })}
<header>
<h1>🛡️ Commander Safety</h1>
<p class="stamp">Static snapshot${Number.isFinite(nowMs) ? ` · ${esc(stamp(nowMs))}` : ''}</p>
</header>
${renderHeroSection(decisions)}
${renderToolFailuresSection(toolFailures)}
${renderDecisionsSection(decisions)}
<footer>🔒 Built from local logs in ~/.claude/commander. If published, the displayed data leaves this machine for your private artifact URL.</footer>
</main>
${TERMINAL_CHROME_CLOSE}`;
}

export { buildSafetyHtml, readSafetyModel };
