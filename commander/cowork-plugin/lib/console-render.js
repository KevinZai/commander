/**
 * console-render.js
 * The ONE presentation path for every Commander deck (v7.4.0 Phase 0).
 *
 * Mission Control, Usage & Cost and Safety each used to own a full copy of the
 * same page: the same brand CSS include, the same terminal chrome, the same deck
 * strip, the same "Static snapshot · <stamp> · Data through: <stamp>" header, the
 * same staleness banner, the same footer. Three copies drift; the v7.4.0 console
 * would have made it four. This module owns all of it:
 *
 *   - renderMissionControlTab(model, opts) ─┐
 *   - renderUsageTab(model, opts)           │
 *   - renderSafetyTab(model, opts)          ├─ pure section markup, no chrome
 *   - renderMemoryTab(model, opts)          │
 *   - renderHistoryTab(model, opts)        ─┘
 *   - buildDeckHtml(model, { tab, surface, now }) — a tab inside the page shell
 *
 * Memory and History (v7.4.0 Phase 2) are console TABS, not new decks: they
 * reuse SNAPSHOT_CSS and the `.mc` layout wholesale rather than growing two more
 * near-identical stylesheets. Adding a deck's worth of CSS for markup that is
 * sections, a table and two sparklines would recreate exactly the duplication
 * this file was extracted to remove.
 *
 * The three lib/*-snapshot.js files keep their readers and their public
 * build*Html() signatures, but their bodies are now one-line delegations to
 * buildDeckHtml() — the markup lives here only. Byte-for-byte equivalence with
 * the pre-extraction output is pinned by commander/tests/console-extraction.test.js
 * against goldens generated BEFORE the extraction.
 *
 * `opts.surface` is 'widget' | 'artifact'. Phase 0 ships 'artifact' only: the
 * inline-widget shell (tab strip, prompt bar, sendPrompt-wired chips) is Phase 1,
 * and buildDeckHtml rejects any other surface rather than silently emitting an
 * artifact page where a widget was asked for. The tab renderers already accept
 * the flag so Phase 1 adds behaviour without changing their signatures.
 *
 * Output discipline inherited from the three originals, unchanged: inline CSS,
 * inline data, no <script>, no external URLs of any kind (strict-CSP Artifact
 * safe), emitted as a fragment (<title> + <style> + chrome + <main>) because the
 * Artifact publisher supplies the doctype/head/body skeleton. Every timestamp
 * derives from the model or the `now` argument — never Date.now() in here.
 * Zero dependencies (beyond this plugin's own lib/), ESM, pure.
 * Core free forever — no license check, no tier gating.
 */
import { brandBaseCss } from './brand-css.js';
import { aggregateDaily, aggregateWeekly, barStrip, sparkline } from './charts.js';
import { deckStripCss, deckStripHtml } from './deck-switcher.js';

const ROW_CAP = 30;
const DOCTOR_POINTER =
  'Run /ccc-doctor to check your hooks are wired. (macOS Desktop: update the plugin to ≥7.2.0 — hook fix.)';

// ---------------------------------------------------------------------------
// Shared helpers. These were three identical copies before the extraction —
// keeping them one copy here is the point of the file. formatDuration and
// taskBucket are exported because mission-control-snapshot.js's reader ALSO
// needs them (its summarize()/mergeEvents() compose human-readable prose) and
// re-exports them as part of its public API — importing beats a fourth copy.

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function stamp(ms) {
  if (!Number.isFinite(ms)) return '';
  return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function timeAgo(tsMs, nowMs) {
  if (!Number.isFinite(tsMs) || !Number.isFinite(nowMs)) return '';
  const delta = nowMs - tsMs;
  if (delta < 45 * 1000) return 'just now';
  if (delta < 60 * 60 * 1000) return `${Math.max(1, Math.round(delta / 60000))}m ago`;
  if (delta < 24 * 60 * 60 * 1000) return `${Math.round(delta / 3600000)}h ago`;
  return `${Math.round(delta / 86400000)}d ago`;
}

function sourceSlug(value) {
  const trimmed = String(value || 'claude-code').trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'claude-code';
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function taskBucket(status) {
  const value = String(status || '').toLowerCase();
  if (/(progress|active|started|running|working|doing)/.test(value)) return 'inProgress';
  if (/(done|complete|closed|resolved|finished|shipped|merged)/.test(value)) return 'done';
  return 'waiting';
}

function nowMsFor(model, opts) {
  const source = model && typeof model === 'object' ? model : {};
  return toMs(opts && opts.now) ?? toMs(source.generatedAt);
}

// ---------------------------------------------------------------------------
// Per-deck CSS. Each block maps the shared brand tokens from ./brand-css.js
// onto that deck's own --mc-* / --uc-* / --sf-* forwarding layer: because a
// custom property's var() reference resolves at used-value time, one
// unconditional block tracks whichever theme brandBaseCss() has active — no
// per-theme duplication needed here.

const SNAPSHOT_CSS = `
:root{
  --mc-bg:var(--bg);--mc-card:var(--bg-card);--mc-fg:var(--text);--mc-muted:var(--text-dim);
  --mc-line:var(--border);--mc-accent:var(--primary);
  --mc-run:var(--accent);--mc-run-bg:color-mix(in srgb,var(--accent) 18%,transparent);
  --mc-ok:var(--green-dot);--mc-ok-bg:color-mix(in srgb,var(--green-dot) 16%,transparent);
  --mc-err:var(--red);--mc-err-bg:color-mix(in srgb,var(--red) 16%,transparent);
  --mc-wait:var(--yellow);--mc-wait-bg:color-mix(in srgb,var(--yellow) 18%,transparent);
}
body{margin:0;background:var(--mc-bg);color:var(--mc-fg);}
.mc-shell{max-width:1080px;margin:20px auto 40px;}
.mc-shell .terminal-title{letter-spacing:0.03em;}
.mc{padding:20px 16px 40px;
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--mc-fg);}
.mc *{box-sizing:border-box;}
.mc h1{font-size:1.45rem;margin:0 0 2px;}
.mc h2{font-size:1.02rem;margin:0 0 10px;}
.mc .stamp{color:var(--mc-muted);margin:0 0 18px;font-size:.86rem;}
.mc section{background:var(--mc-card);border:1px solid var(--mc-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.mc .summary-text{font-size:1.06rem;margin:0 0 10px;}
.mc .chips{display:flex;flex-wrap:wrap;gap:8px;}
.mc .chip{border:1px solid var(--mc-line);border-radius:999px;
  padding:2px 10px;font-size:.8rem;color:var(--mc-muted);white-space:nowrap;}
.mc .badge{display:inline-block;border-radius:999px;padding:1px 9px;
  font-size:.78rem;font-weight:600;white-space:nowrap;}
.mc .src{display:inline-block;border:1px solid var(--mc-line);border-radius:999px;
  padding:0 8px;font-size:.72rem;font-weight:600;color:var(--mc-muted);
  background:var(--mc-line);white-space:nowrap;}
.mc .src-claude-code{color:var(--mc-accent);border-color:var(--mc-accent);
  background:color-mix(in srgb,var(--mc-accent) 16%,transparent);}
.mc .st-running{color:var(--mc-run);background:var(--mc-run-bg);}
.mc .st-done{color:var(--mc-ok);background:var(--mc-ok-bg);}
.mc .st-failed{color:var(--mc-err);background:var(--mc-err-bg);}
.mc .st-stale{color:var(--mc-muted);background:var(--mc-line);}
.mc .st-waiting,.mc .st-awaiting{color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .permission-banner{border-color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .permission-banner h2{color:var(--mc-wait);}
.mc .permission-banner p{margin:8px 0 0;}
.mc .permission-banner li{border-color:color-mix(in srgb,var(--mc-wait) 30%,transparent);}
.mc .stale-banner{border-color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .stale-banner p{margin:0;color:var(--mc-wait);font-size:.9rem;}
.mc .scroll{overflow-x:auto;}
.mc table{border-collapse:collapse;width:100%;font-size:.9rem;}
.mc th{text-align:left;color:var(--mc-muted);font-weight:600;
  border-bottom:1px solid var(--mc-line);padding:6px 12px 6px 0;white-space:nowrap;}
.mc td{border-bottom:1px solid var(--mc-line);padding:7px 12px 7px 0;
  vertical-align:top;}
.mc tr:last-child td{border-bottom:none;}
.mc .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;}
.mc .muted{color:var(--mc-muted);}
.mc .zero{color:var(--mc-muted);margin:0;}
.mc .chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;}
.mc .chart-card{border:1px solid var(--mc-line);border-radius:10px;padding:10px 12px 8px;min-width:0;}
.mc .chart-card h3{margin:0 0 6px;font-size:.8rem;font-weight:600;color:var(--mc-muted);}
.mc .mc-chart{display:block;width:100%;height:auto;color:var(--mc-accent);}
.mc .agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;}
.mc .agent-card{border:1px solid var(--mc-line);border-radius:10px;padding:12px;min-width:0;}
.mc .agent-card.is-awaiting{border-color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .agent-card.is-stale{color:var(--mc-muted);opacity:.68;}
.mc .agent-card.is-derived{opacity:.82;}
.mc .agent-card.is-derived .agent-meta{opacity:.55;}
.mc .derived-badge{display:inline-block;border:1px dashed var(--mc-line);border-radius:999px;
  padding:0 7px;font-size:.68rem;color:var(--mc-muted);margin-left:4px;cursor:help;white-space:nowrap;}
.mc .agent-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.mc .agent-name{display:flex;gap:9px;align-items:flex-start;min-width:0;}
.mc .agent-emoji{font-size:1.35rem;line-height:1.2;}
.mc .agent-role,.mc .agent-task,.mc .agent-meta{color:var(--mc-muted);font-size:.82rem;}
.mc .agent-task{margin:10px 0;color:var(--mc-fg);overflow-wrap:anywhere;}
.mc .agent-meta{display:flex;flex-wrap:wrap;gap:5px 12px;}
.mc .board{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
.mc .col{border:1px solid var(--mc-line);border-radius:10px;padding:10px;min-width:0;}
.mc .col h3{margin:0 0 8px;font-size:.86rem;color:var(--mc-muted);}
.mc .card{border:1px solid var(--mc-line);border-radius:8px;padding:8px 10px;
  margin-bottom:8px;font-size:.9rem;overflow-wrap:anywhere;}
.mc .card:last-child{margin-bottom:0;}
.mc .card .when{display:block;font-size:.78rem;color:var(--mc-muted);margin-top:2px;}
.mc ul,.mc ol{margin:0;padding-left:0;list-style:none;}
.mc li{padding:6px 0;border-bottom:1px solid var(--mc-line);overflow-wrap:anywhere;}
.mc li:last-child{border-bottom:none;}
.mc .arrow{color:var(--mc-accent);font-weight:700;}
.mc footer{color:var(--mc-muted);font-size:.82rem;text-align:center;}
@media (max-width:560px){.mc{padding:16px 10px 32px;}.mc section{padding:12px;}}
`;

const USAGE_CSS = `
:root{
  --uc-bg:var(--bg);--uc-card:var(--bg-card);--uc-fg:var(--text);--uc-muted:var(--text-dim);
  --uc-line:var(--border);--uc-accent:var(--primary);
  --uc-ok:var(--green-dot);--uc-ok-bg:color-mix(in srgb,var(--green-dot) 16%,transparent);
  --uc-warn:var(--red-dot,#e5484d);
}
body{margin:0;background:var(--uc-bg);color:var(--uc-fg);}
.uc-shell{max-width:1080px;margin:20px auto 40px;}
.uc-shell .terminal-title{letter-spacing:0.03em;}
.uc{padding:20px 16px 40px;
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--uc-fg);}
.uc *{box-sizing:border-box;}
.uc h1{font-size:1.45rem;margin:0 0 2px;}
.uc h2{font-size:1.02rem;margin:0 0 10px;}
.uc .tf-note{color:var(--uc-muted);font-size:.75em;font-weight:400;}
.uc .stamp{color:var(--uc-muted);margin:0 0 18px;font-size:.86rem;}
.uc section{background:var(--uc-card);border:1px solid var(--uc-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.uc .hero{border-color:var(--uc-accent);}
.uc .hero-line{font-size:1.12rem;margin:0 0 8px;}
.uc .hero-amount{color:var(--uc-ok);font-size:1.3em;font-weight:700;}
.uc .hero-negative{border-color:var(--uc-warn);}
.uc .hero-negative .hero-amount{color:var(--uc-warn);}
.uc .stale-banner{border-color:var(--uc-warn);background:color-mix(in srgb,var(--uc-warn) 12%,transparent);}
.uc .stale-banner p{margin:0;color:var(--uc-warn);font-size:.9rem;}
.uc .disclaimer{margin:0;font-size:.8rem;}
.uc .muted{color:var(--uc-muted);}
.uc .zero{color:var(--uc-muted);margin:0;}
.uc .chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;}
.uc .chart-card{border:1px solid var(--uc-line);border-radius:10px;padding:10px 12px 8px;min-width:0;}
.uc .chart-card h3{margin:0 0 6px;font-size:.8rem;font-weight:600;color:var(--uc-muted);}
.uc .mc-chart{display:block;width:100%;height:auto;color:var(--uc-accent);}
.uc .cost-list{margin:0;padding:0;list-style:none;}
.uc .cost-row{padding:8px 0;border-bottom:1px solid var(--uc-line);}
.uc .cost-row:last-child{border-bottom:none;}
.uc .cost-row-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.uc .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;}
.uc .src{display:inline-block;border:1px solid var(--uc-line);border-radius:999px;
  padding:0 8px;font-size:.72rem;font-weight:600;color:var(--uc-muted);
  background:var(--uc-line);white-space:nowrap;}
.uc .src-claude-code{color:var(--uc-accent);border-color:var(--uc-accent);
  background:color-mix(in srgb,var(--uc-accent) 16%,transparent);}
.uc .cost-bar-track{height:6px;border-radius:999px;background:var(--uc-line);overflow:hidden;}
.uc .cost-bar-fill{height:100%;background:var(--uc-accent);border-radius:999px;}
.uc footer{color:var(--uc-muted);font-size:.82rem;text-align:center;}
@media (max-width:560px){.uc{padding:16px 10px 32px;}.uc section{padding:12px;}}
`;

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
.safety .stale-banner{border-color:var(--sf-warn);background:var(--sf-warn-bg);}
.safety .stale-banner p{margin:0;color:var(--sf-warn);font-size:.9rem;}
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

// ---------------------------------------------------------------------------
// Page shell. Everything that differs between the three decks is data, not code.
//
// staleThresholdMs is per-deck on purpose: Usage is 48h, NOT 24h, because its
// sources are DAY-granularity (savings.json day-keys, metrics.jsonl `date` rows)
// each treated as its UTC midnight — a genuinely-fresh "yesterday" bucket is
// already up to ~24h old at comparison time, so a 24h threshold would false-flag
// fresh data every day right after midnight UTC.

const TAB_CHROME = Object.freeze({
  'mission-control': {
    title: 'Commander Mission Control',
    heading: '🎛️ Commander Mission Control',
    shellClass: 'mc-shell',
    terminalTitle: 'commander &middot; mission-control',
    mainClass: 'mc',
    css: SNAPSHOT_CSS,
    staleThresholdMs: 24 * 60 * 60 * 1000,
  },
  usage: {
    title: 'Commander Usage &amp; Cost',
    heading: '💰 Commander Usage &amp; Cost',
    shellClass: 'uc-shell',
    terminalTitle: 'commander &middot; usage',
    mainClass: 'uc',
    css: USAGE_CSS,
    staleThresholdMs: 48 * 60 * 60 * 1000,
  },
  safety: {
    title: 'Commander Safety',
    heading: '🛡️ Commander Safety',
    shellClass: 'sf-shell',
    terminalTitle: 'commander &middot; safety',
    mainClass: 'safety',
    css: SAFETY_CSS,
    staleThresholdMs: 24 * 60 * 60 * 1000,
  },
  // Memory reads claude-mem, an OPTIONAL third-party store Commander neither
  // bundles nor writes. staleThresholdMs is null (no banner) because the banner
  // says "hooks may not be running — run /ccc-doctor", which is simply untrue of
  // someone who just hasn't used claude-mem for two days.
  memory: {
    title: 'Commander Memory',
    heading: '🧠 Commander Memory',
    shellClass: 'mc-shell',
    terminalTitle: 'commander &middot; memory',
    mainClass: 'mc',
    css: SNAPSHOT_CSS,
    staleThresholdMs: null,
    // The shared footer's "~/.claude/commander" would be wrong here — this tab
    // is the only one that reads someone else's store.
    sourceNote:
      "Built from your own claude-mem store in ~/.claude-mem (titles only, read-only). If published, the displayed data leaves this machine for your private artifact URL.",
  },
  // 48h, not 24h — same reason as Usage: History's backbone is
  // metrics.jsonl's DAY-granularity rows, each treated as its UTC midnight, so
  // a genuinely fresh "today" bucket is already up to ~24h old at comparison.
  history: {
    title: 'Commander History',
    heading: '📜 Commander History',
    shellClass: 'mc-shell',
    terminalTitle: 'commander &middot; history',
    mainClass: 'mc',
    css: SNAPSHOT_CSS,
    staleThresholdMs: 48 * 60 * 60 * 1000,
  },
});

const TAB_RENDERERS = {
  'mission-control': renderMissionControlTab,
  usage: renderUsageTab,
  safety: renderSafetyTab,
  memory: renderMemoryTab,
  history: renderHistoryTab,
};

// Terminal-window chrome wraps the whole board: 3 traffic-light dots + a mono
// title, matching commanderplugin.com's `.terminal` component. Deterministic,
// CSP-safe (no <script>).
function renderTerminalChromeOpen(chrome) {
  return `<div class="terminal-chrome ${chrome.shellClass}">
<div class="terminal-header">
<span class="terminal-dot red" aria-hidden="true"></span><span class="terminal-dot yellow" aria-hidden="true"></span><span class="terminal-dot green" aria-hidden="true"></span>
<span class="terminal-title">${chrome.terminalTitle}</span>
</div>`;
}

const TERMINAL_CHROME_CLOSE = '</div>';

// Staleness warning banner (v7.3.0, Item 6) — only rendered when at least one
// source row exists but the newest one is older than the threshold. The
// fully-empty case (no source rows at all) is handled separately by each tab's
// zero-state hero appending DOCTOR_POINTER, not by this banner.
function renderStalenessBanner(dataThroughMs, nowMs, thresholdMs) {
  if (!Number.isFinite(dataThroughMs) || !Number.isFinite(nowMs)) return '';
  // A null/absent threshold means "this tab has no staleness opinion" (Memory —
  // see TAB_CHROME). Without this guard `x <= null` is false and every render
  // would raise the banner, which is the opposite of the intent.
  if (!Number.isFinite(thresholdMs)) return '';
  if (nowMs - dataThroughMs <= thresholdMs) return '';
  return `<section aria-label="Telemetry freshness" class="stale-banner">
<p>⚠️ Telemetry last written ${esc(timeAgo(dataThroughMs, nowMs))} — hooks may not be running. Run /ccc-doctor. (macOS Desktop: update the plugin to ≥7.2.0 — hook fix.)</p>
</section>`;
}

/**
 * Wrap one tab's sections in the shared deck page.
 *
 * @param {object} model  the tab's model (see the matching read*Model())
 * @param {{tab: string, surface?: 'widget'|'artifact', now?: string|number|Date}} opts
 * @returns {string} a self-contained, script-free HTML fragment
 */
function buildDeckHtml(model, { tab, surface = 'artifact', now } = {}) {
  const chrome = Object.hasOwn(TAB_CHROME, tab) ? TAB_CHROME[tab] : null;
  if (!chrome) throw new Error(`buildDeckHtml: unknown tab "${tab}"`);
  if (surface !== 'artifact') {
    throw new Error(`buildDeckHtml: surface "${surface}" is not implemented yet (Phase 1)`);
  }

  const source = model && typeof model === 'object' ? model : {};
  const dataThroughMs = Number.isFinite(source.dataThroughMs) ? source.dataThroughMs : null;
  const nowMs = nowMsFor(source, { now });
  const dataThroughLine =
    dataThroughMs !== null ? ` · Data through: ${esc(stamp(dataThroughMs))}` : '';

  return `<meta charset="utf-8">
<title>${chrome.title}</title>
<style>${brandBaseCss()}${deckStripCss()}${chrome.css}</style>
${renderTerminalChromeOpen(chrome)}
<main class="${chrome.mainClass}">
${deckStripHtml(tab, { interactive: false })}
<header>
<h1>${chrome.heading}</h1>
<p class="stamp">Static snapshot${Number.isFinite(nowMs) ? ` · ${esc(stamp(nowMs))}` : ''}${dataThroughLine}</p>
</header>
${renderStalenessBanner(dataThroughMs, nowMs, chrome.staleThresholdMs)}
${TAB_RENDERERS[tab](source, { surface, now })}
<footer>🔒 ${chrome.sourceNote || 'Built from local logs in ~/.claude/commander. If published, the displayed data leaves this machine for your private artifact URL.'}</footer>
</main>
${TERMINAL_CHROME_CLOSE}`;
}

// ---------------------------------------------------------------------------
// Mission Control tab

function renderSourceBadge(sourceApp) {
  const label = typeof sourceApp === 'string' && sourceApp.trim() ? sourceApp.trim() : 'claude-code';
  return `<span class="src src-${sourceSlug(label)}">${esc(label)}</span>`;
}

const STATUS_META = {
  running: { label: 'working', cls: 'st-running' },
  awaiting_permission: { label: '⚠ awaiting approval', cls: 'st-awaiting' },
  done: { label: 'finished', cls: 'st-done' },
  failed: { label: 'hit a problem', cls: 'st-failed' },
  stale: { label: 'stale (no end recorded)', cls: 'st-stale' },
};

const SUGGESTION_STATUS_META = {
  new: { label: 'new', cls: 'st-waiting' },
  promoted: { label: 'promoted', cls: 'st-done' },
  dismissed: { label: 'dismissed', cls: 'st-stale' },
};

function renderSummarySection(summary, agents, tasks) {
  const running = agents.filter((agent) => agent.status === 'running').length;
  const awaiting = agents.filter((agent) => agent.status === 'awaiting_permission').length;
  const failed = agents.filter((agent) => agent.status === 'failed').length;
  const finished = agents.filter((agent) => agent.status === 'done').length;
  const headlineAgents = agents.filter((agent) => agent.status !== 'stale').length;
  const buckets = { inProgress: 0, done: 0, waiting: 0 };
  for (const task of tasks) buckets[taskBucket(task.status)] += 1;

  const chips = [
    `🤖 ${headlineAgents} agent${headlineAgents === 1 ? '' : 's'}`,
    `🔄 ${running} working`,
    `⚠ ${awaiting} awaiting approval`,
    `✅ ${finished} finished`,
    `❌ ${failed} failed`,
    `📋 ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
    `⏳ ${buckets.inProgress} in progress`,
    `🕐 ${buckets.waiting} waiting`,
    `🏁 ${buckets.done} done`,
  ];

  return `<section aria-label="Summary">
<p class="summary-text">${esc(summary)}</p>
<div class="chips">${chips.map((chip) => `<span class="chip">${esc(chip)}</span>`).join('')}</div>
</section>`;
}

function renderAwaitingPermissionSection(awaitingPermission, nowMs) {
  if (awaitingPermission.length === 0) return '';

  const items = awaitingPermission.slice(0, ROW_CAP).map((permission) => {
    const sessionId = permission.session_id ?? 'unknown';
    const subject = permission.subject || 'Approval needed';
    const when = timeAgo(toMs(permission.ts) ?? NaN, nowMs ?? NaN);
    return `<li><strong>${esc(subject)}</strong> · session <span class="mono">${esc(sessionId)}</span>${when ? ` <span class="muted">· ${esc(when)}</span>` : ''}</li>`;
  });

  return `<section class="permission-banner" aria-label="Awaiting permission">
<h2>⚠ Waiting for your approval</h2>
<ul>${items.join('')}</ul>
<p><strong>Switch to that session to approve.</strong></p>
</section>`;
}

function renderAgentsSection(agents, nowMs) {
  if (agents.length === 0) {
    return `<section aria-label="Agent roster">
<h2>🤖 Agents</h2>
<p class="zero">No agents yet — spawn one with /ccc-spawn and this board lights up.</p>
</section>`;
  }

  const cards = agents.slice(0, ROW_CAP).map((agent) => {
    const meta = STATUS_META[agent.status] || {
      label: 'unknown status',
      cls: 'st-stale',
    };
    const isDerived = agent.derived === true;
    const startMs = toMs(agent.startedAt);
    const started = timeAgo(startMs ?? NaN, nowMs ?? NaN) || (startMs !== null ? stamp(startMs) : '—');
    // A derived row's startedAt is the delegation event, not a real start — we
    // don't measure its runtime, so show '—' rather than a "Xm so far" duration.
    let took = '—';
    if (!isDerived) {
      if (agent.status === 'running') {
        took =
          startMs !== null && Number.isFinite(nowMs) && nowMs > startMs
            ? `${formatDuration(nowMs - startMs)} so far`
            : 'just started';
      } else if (Number.isFinite(agent.durationMs) && agent.durationMs > 0) {
        took = formatDuration(agent.durationMs);
      }
    }
    const tasksCompleted = Number.isFinite(agent.tasksCompleted)
      ? Math.max(0, Math.round(agent.tasksCompleted))
      : 0;
    // Derived rows carry no real cost — show it absent, not $0.0000 (reads as free).
    const cost =
      !isDerived && Number.isFinite(agent.estCostUsd)
        ? `$${agent.estCostUsd.toFixed(4)}`
        : '—';
    const currentTask = agent.currentTask || 'No current task';
    const statusClass =
      (agent.status === 'awaiting_permission'
        ? ' is-awaiting'
        : agent.status === 'stale'
          ? ' is-stale'
          : '') + (isDerived ? ' is-derived' : '');
    const derivedBadge = isDerived
      ? ` <span class="derived-badge" title="Inferred from a delegation event — no token/cost data available">inferred</span>`
      : '';
    return `<article class="agent-card${statusClass}">
<div class="agent-head">
<div class="agent-name"><span class="agent-emoji" aria-hidden="true">${esc(agent.emoji || '🤖')}</span><div><strong>${esc(agent.name)}</strong><div class="agent-role">${esc(agent.role || 'Agent')} · ${renderSourceBadge(agent.sourceApp)}${derivedBadge}</div></div></div>
<span class="badge ${meta.cls}">${esc(meta.label)}</span>
</div>
<p class="agent-task"><strong>Current task:</strong> ${esc(currentTask)}</p>
<div class="agent-meta">
<span>${esc(tasksCompleted)} task${tasksCompleted === 1 ? '' : 's'} completed</span>
<span>Est. cost: <span class="mono">${esc(cost)}</span></span>
<span>Started: ${esc(started)}</span>
<span>Took: <span class="mono">${esc(took)}</span></span>
<span>Model: <span class="mono">${esc(agent.model || '—')}</span></span>
</div>
</article>`;
  });

  const overflow =
    agents.length > ROW_CAP
      ? `<p class="muted">…and ${agents.length - ROW_CAP} earlier run${agents.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  return `<section aria-label="Agent roster">
<h2>🤖 Agents</h2>
<div class="agent-grid">${cards.join('')}</div>${overflow}
</section>`;
}

function renderTasksSection(tasks, nowMs) {
  if (tasks.length === 0) {
    return `<section aria-label="Task board">
<h2>📋 Tasks</h2>
<p class="zero">No tasks tracked yet.</p>
</section>`;
  }

  const columns = [
    ['inProgress', 'In progress', 'st-running'],
    ['waiting', 'Waiting', 'st-waiting'],
    ['done', 'Done', 'st-done'],
  ];

  const cols = columns.map(([bucket, label, cls]) => {
    const items = tasks.filter((task) => taskBucket(task.status) === bucket).slice(0, ROW_CAP);
    const cards = items.map((task) => {
      const when = timeAgo(toMs(task.ts) ?? NaN, nowMs ?? NaN);
      return `<div class="card"><span class="badge ${cls}">${esc(label.toLowerCase())}</span> ${esc(task.title)}${when ? `<span class="when">${esc(when)}</span>` : ''}</div>`;
    });
    return `<div class="col"><h3>${esc(label)} · ${items.length}</h3>${cards.join('') || '<p class="zero">none</p>'}</div>`;
  });

  return `<section aria-label="Task board">
<h2>📋 Tasks</h2>
<div class="board">${cols.join('')}</div>
</section>`;
}

function renderEdgesSection(edges, nowMs) {
  if (edges.length === 0) {
    return `<section aria-label="Delegation flow">
<h2>🔀 Delegation flow</h2>
<p class="zero">No delegations recorded yet — when a session hands work to an agent, it shows up here.</p>
</section>`;
  }

  const items = edges.slice(0, ROW_CAP).map((edge) => {
    const when = timeAgo(toMs(edge.ts) ?? NaN, nowMs ?? NaN);
    return `<li><span class="mono">${esc(edge.from)}</span> <span class="arrow">→</span> <strong>${esc(edge.to)}</strong> <span class="chip">${esc(edge.type)}</span>${when ? ` <span class="muted">${esc(when)}</span>` : ''}</li>`;
  });

  return `<section aria-label="Delegation flow">
<h2>🔀 Delegation flow</h2>
<ul>${items.join('')}</ul>
</section>`;
}

function renderEventsSection(events, nowMs) {
  if (events.length === 0) {
    return `<section aria-label="Latest activity">
<h2>🕐 Latest activity</h2>
<p class="zero">No activity yet.</p>
</section>`;
  }

  const items = events.slice(0, ROW_CAP).map((event) => {
    const ms = toMs(event.ts);
    const when = timeAgo(ms ?? NaN, nowMs ?? NaN) || (ms !== null ? stamp(ms) : '');
    return `<li>${when ? `<span class="muted mono">${esc(when)}</span> ` : ''}${renderSourceBadge(event.sourceApp)} ${esc(event.text)}</li>`;
  });

  return `<section aria-label="Latest activity">
<h2>🕐 Latest activity</h2>
<ol>${items.join('')}</ol>
</section>`;
}

function renderSuggestionsSection(suggestions) {
  if (suggestions.length === 0) {
    return `<section aria-label="Suggestions">
<h2>💡 Suggestions</h2>
<p class="zero">No suggestions yet — agents surface ideas here as they notice them.</p>
</section>`;
  }

  const items = suggestions.slice(0, ROW_CAP).map((suggestion) => {
    const meta = SUGGESTION_STATUS_META[suggestion.status] || {
      label: suggestion.status || 'unknown',
      cls: 'st-stale',
    };
    const from = suggestion.from ? `<strong>${esc(suggestion.from)}</strong> — ` : '';
    const idea = suggestion.idea ? esc(suggestion.idea) : 'No idea text.';
    const evidence = suggestion.evidence
      ? `<div class="muted">${esc(suggestion.evidence)}</div>`
      : '';
    const proposedTitle =
      suggestion.proposed_ticket && suggestion.proposed_ticket.title
        ? `<div class="muted">Proposed: ${esc(suggestion.proposed_ticket.title)}</div>`
        : '';
    const promoted =
      suggestion.status === 'promoted' && suggestion.promoted_ticket
        ? `<div class="muted">Tracked as: ${esc(
            suggestion.promoted_ticket.title ||
              suggestion.promoted_ticket.id ||
              suggestion.promoted_ticket.url ||
              'ticket'
          )}</div>`
        : '';
    return `<li><span class="badge ${meta.cls}">${esc(meta.label)}</span> ${from}${idea}${evidence}${proposedTitle}${promoted}</li>`;
  });

  const overflow =
    suggestions.length > ROW_CAP
      ? `<p class="muted">…and ${suggestions.length - ROW_CAP} more suggestion${suggestions.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  return `<section aria-label="Suggestions">
<h2>💡 Suggestions</h2>
<ul>${items.join('')}</ul>${overflow}
</section>`;
}

// Item 3 — same builders the live dashboard's client-side script uses
// (./charts.js), server-rendered here into plain inline SVG (no <script>,
// CSP-safe). Combines every source_app into one line per chart (Item 2's
// public-repo scope: Claude + Codex only). A metrics array with no rows at all
// still renders 4 zero-state charts, never an empty section — Charts stay
// always-visible (unlike History, which is opt-in and hides entirely when absent).
function renderMissionChartsSection(metrics) {
  const rows = Array.isArray(metrics) ? metrics : [];
  const costSeries = aggregateDaily(rows, 'cost_usd', 30);
  const agentsSeries = aggregateDaily(rows, 'agents_dispatched', 30);
  const failuresSeries = aggregateDaily(rows, 'tool_failures', 30);
  const tasksSeries = aggregateWeekly(rows, 'tasks_completed', 8);

  const cards = [
    [
      '💰 Cost / day (30d)',
      sparkline(costSeries, { label: 'Cost per day, last 30 days', color: 'var(--mc-accent)' }),
    ],
    [
      '🤖 Agents dispatched / day (30d)',
      sparkline(agentsSeries, { label: 'Agents dispatched per day, last 30 days', color: 'var(--mc-run)' }),
    ],
    [
      '📋 Tasks completed / week (8w)',
      barStrip(tasksSeries, { label: 'Tasks completed per week, last 8 weeks', color: 'var(--mc-ok)' }),
    ],
    [
      '⚠ Tool failures / day (30d)',
      sparkline(failuresSeries, { label: 'Tool failures per day, last 30 days', color: 'var(--mc-err)' }),
    ],
  ];

  return `<section aria-label="Trends">
<h2>📈 Trends</h2>
<div class="chart-grid">${cards.map(([title, svg]) => `<div class="chart-card"><h3>${esc(title)}</h3>${svg}</div>`).join('')}</div>
</section>`;
}

/**
 * @param {object} model  a lib/mission-control-snapshot.js readModel() result
 * @param {{surface?: 'widget'|'artifact', now?: string|number|Date}} [opts]
 */
function renderMissionControlTab(model, opts = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const agents = Array.isArray(source.agents) ? source.agents : [];
  const tasks = Array.isArray(source.tasks) ? source.tasks : [];
  const edges = Array.isArray(source.edges) ? source.edges : [];
  const events = Array.isArray(source.events) ? source.events : [];
  const suggestions = Array.isArray(source.suggestions) ? source.suggestions : [];
  const metrics = Array.isArray(source.metrics) ? source.metrics : [];
  const awaitingPermission = Array.isArray(source.awaitingPermission)
    ? source.awaitingPermission
    : [];
  const summary =
    typeof source.summary === 'string' && source.summary
      ? source.summary
      : 'No agent activity yet.';
  const hasAnySourceRow = source.hasAnySourceRow !== false;
  const nowMs = nowMsFor(source, opts);
  const empty =
    agents.length === 0 &&
    tasks.length === 0 &&
    edges.length === 0 &&
    events.length === 0 &&
    suggestions.length === 0 &&
    awaitingPermission.length === 0;
  const doctorNote = empty && !hasAnySourceRow ? ` ${DOCTOR_POINTER}` : '';

  const hero = empty
    ? `<section aria-label="Getting started">
<p class="zero">🎛️ Nothing to show yet — no agents have run on this machine. Spawn one with /ccc-spawn (or fan out with /ccc-fleet) and mission control lights up.${esc(doctorNote)}</p>
</section>`
    : '';

  return [
    renderAwaitingPermissionSection(awaitingPermission, nowMs),
    hero,
    renderSummarySection(summary, agents, tasks),
    renderMissionChartsSection(metrics),
    renderAgentsSection(agents, nowMs),
    renderTasksSection(tasks, nowMs),
    renderEdgesSection(edges, nowMs),
    renderEventsSection(events, nowMs),
    renderSuggestionsSection(suggestions),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Usage & Cost tab

function formatUsd(value) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Savings-source honesty sub-note (W2+/codex 6) — only shown when savings.json
// has no day bucket within the last 7 days (or was never written), since
// savings.json is exclusively a legacy-CLI-dispatcher signal.
function renderSavingsSourceNote(savingsStale) {
  if (!savingsStale) return '';
  return '<p class="muted disclaimer">Savings tracking currently comes from CLI dispatches — plugin-native agent runs aren\'t counted yet.</p>';
}

function renderUsageHeroSection(totalSavedUsd, totalDispatches, { savingsStale = false, hasAnySourceRow = true } = {}) {
  if (!Number.isFinite(totalDispatches) || totalDispatches <= 0) {
    const doctorNote = hasAnySourceRow ? '' : ` ${DOCTOR_POINTER}`;
    return `<section aria-label="Savings summary">
<p class="zero">💰 No savings data yet — dispatch a task and Commander starts tracking what delegating to cheaper models saved you.${esc(doctorNote)}</p>
${renderSavingsSourceNote(savingsStale)}
</section>`;
  }

  const dispatchCount = Math.max(0, Math.round(totalDispatches));
  const dispatchWord = `dispatch${dispatchCount === 1 ? '' : 'es'}`;
  const disclaimer = '<p class="muted disclaimer">Estimates vs an all-Opus 4.8 baseline, ±30%. Not actual Anthropic billing data.</p>';
  const savingsNote = renderSavingsSourceNote(savingsStale);

  // Negative "savings" is legitimate — delegation that ran pricier than the
  // all-Opus baseline. Render it honestly as an extra cost (warn-coloured),
  // not as green success copy reading "saved you -$3.50".
  if (Number.isFinite(totalSavedUsd) && totalSavedUsd < 0) {
    const overLabel = formatUsd(Math.abs(totalSavedUsd));
    return `<section aria-label="Savings summary" class="hero hero-negative">
<p class="hero-line">Delegation cost <span class="hero-amount">${esc(overLabel)}</span> more than an all-Opus 4.8 baseline across ${esc(dispatchCount)} ${dispatchWord}.</p>
${disclaimer}
${savingsNote}
</section>`;
  }

  const savedLabel = formatUsd(totalSavedUsd);
  return `<section aria-label="Savings summary" class="hero">
<p class="hero-line">Delegating to cheaper models saved you <span class="hero-amount">${esc(savedLabel)}</span> across ${esc(dispatchCount)} ${dispatchWord}.</p>
${disclaimer}
${savingsNote}
</section>`;
}

// Same sparkline builder Mission Control's Charts strip uses — see ./charts.js's
// doc comment for why it's one canonical module.
function renderUsageChartsSection(savingsSeries, costSeries) {
  const cards = [
    [
      '💵 Saved / day (30d)',
      sparkline(savingsSeries, { label: 'Amount saved per day, last 30 days', color: 'var(--uc-ok)' }),
    ],
    [
      '💳 Cost / day (30d)',
      sparkline(costSeries, { label: 'Dispatch cost per day, last 30 days', color: 'var(--uc-accent)' }),
    ],
  ];

  return `<section aria-label="Trends">
<h2>📈 Trends</h2>
<div class="chart-grid">${cards.map(([title, svg]) => `<div class="chart-card"><h3>${esc(title)}</h3>${svg}</div>`).join('')}</div>
</section>`;
}

function renderCostByAppSection(costByApp) {
  const rows = Array.isArray(costByApp) ? costByApp : [];
  const hasData = rows.some((row) => Number.isFinite(row.costUsd) && row.costUsd > 0);

  if (!hasData) {
    return `<section aria-label="Cost by app">
<h2>🧮 Cost by app</h2>
<p class="zero">No cost data yet.</p>
</section>`;
  }

  const items = rows.slice(0, ROW_CAP).map((row) => {
    const pct = Number.isFinite(row.pct) ? row.pct : 0;
    const widthPct = Math.max(0, Math.min(100, pct));
    return `<li class="cost-row">
<div class="cost-row-head"><span class="src src-${sourceSlug(row.sourceApp)}">${esc(row.sourceApp)}</span><span class="mono">${esc(formatUsd(row.costUsd))} &middot; ${esc(fmtPct(pct))}%</span></div>
<div class="cost-bar-track"><div class="cost-bar-fill" style="width:${fmtPct(widthPct)}%"></div></div>
</li>`;
  });

  const overflow =
    rows.length > ROW_CAP
      ? `<p class="muted">…and ${rows.length - ROW_CAP} more app${rows.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  // Timeframe label matters: the Trends charts above are explicitly 30-day, but
  // this breakdown totals all retained metrics history. Label it so a large
  // all-time total isn't misread as a 30-day figure.
  return `<section aria-label="Cost by app">
<h2>🧮 Cost by app <span class="tf-note">· all time (retained history)</span></h2>
<ul class="cost-list">${items.join('')}</ul>${overflow}
</section>`;
}

/**
 * @param {object} model  a lib/usage-snapshot.js readUsageModel() result
 * @param {{surface?: 'widget'|'artifact', now?: string|number|Date}} [opts]
 */
function renderUsageTab(model, opts = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const totalSavedUsd = Number.isFinite(source.totalSavedUsd) ? source.totalSavedUsd : 0;
  const totalDispatches = Number.isFinite(source.totalDispatches) ? source.totalDispatches : 0;
  const savingsSeries = Array.isArray(source.savingsSeries) ? source.savingsSeries : [];
  const costSeries = Array.isArray(source.costSeries) ? source.costSeries : [];
  const costByApp = Array.isArray(source.costByApp) ? source.costByApp : [];
  const hasAnySourceRow = source.hasAnySourceRow !== false;
  const savingsStale = source.savingsStale === true;

  return [
    renderUsageHeroSection(totalSavedUsd, totalDispatches, { savingsStale, hasAnySourceRow }),
    renderUsageChartsSection(savingsSeries, costSeries),
    renderCostByAppSection(costByApp),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Safety tab

function pct(count, total) {
  if (!Number.isFinite(total) || total <= 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function renderSafetyHeroSection(decisions, { hasAnySourceRow = true } = {}) {
  const { total, blocked, autofixed, approved, otherCount } = decisions;

  if (total === 0) {
    const doctorNote = hasAnySourceRow ? '' : ` ${DOCTOR_POINTER}`;
    return `<section aria-label="Safety overview">
<h2>🛡️ Safety overview</h2>
<p class="zero">No permission-gate telemetry yet — Commander hasn't logged any tool-permission decisions on this machine.${esc(doctorNote)}</p>
</section>`;
  }

  // `blocked` aggregates dangerous-command blocks AND denied-autofix writes, so
  // the headline says "action(s)", not "dangerous action(s)". The auto-fixed
  // clause is only shown when a genuine applied fix exists — "auto-fixed 0 for
  // you" is noise (and, before the classifier fix, was actively wrong: denied
  // autofixes were miscounted here).
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

/**
 * @param {object} model  a lib/safety-snapshot.js readSafetyModel() result
 * @param {{surface?: 'widget'|'artifact', now?: string|number|Date}} [opts]
 */
function renderSafetyTab(model, opts = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const decisions =
    source.decisions && typeof source.decisions === 'object'
      ? source.decisions
      : { total: 0, counts: [], blocked: 0, autofixed: 0, approved: 0, otherCount: 0 };
  const toolFailures =
    source.toolFailures && typeof source.toolFailures === 'object'
      ? source.toolFailures
      : { total: 0, byTool: [], topErrors: [] };
  const hasAnySourceRow = source.hasAnySourceRow !== false;

  return [
    renderSafetyHeroSection(decisions, { hasAnySourceRow }),
    renderToolFailuresSection(toolFailures),
    renderDecisionsSection(decisions),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Memory tab (v7.4.0 Phase 2)
//
// The store is claude-mem's, and claude-mem is AGPL-3.0 — Commander does not
// bundle it, so NOT HAVING IT IS THE NORMAL CASE. That state renders as one
// quiet hint card in ordinary muted styling: no red, no ⚠, no "error", and no
// repeat nagging. Every title and project has already been redacted and capped
// by memory-reader.js; here they are escaped TEXT and nothing else — a memory
// title never becomes a link, a command, or a chip payload.

const MEMORY_INSTALL_HINT =
  'Optional and separate: install claude-mem (npm install -g claude-mem) and this tab fills in. It is AGPL-licensed, which is why Commander does not bundle it.';

function renderMemoryUnavailableSection(reason) {
  return `<section aria-label="Memory">
<h2>🧠 Memory</h2>
<p class="zero">${esc(reason || 'claude-mem not detected — install it separately to see session memory here.')}</p>
<p class="muted">${esc(MEMORY_INSTALL_HINT)}</p>
</section>`;
}

function renderMemorySummarySection(counts, projects) {
  const chips = [
    `🧠 ${counts.last7d} in the last 7 days`,
    `📅 ${counts.last30d} in the last 30 days`,
    `👀 showing the ${counts.shown} most recent`,
  ];
  const projectChips = projects.map(
    (entry) => `<span class="chip">${esc(entry.project)} · ${esc(entry.count)}</span>`
  );

  return `<section aria-label="Memory summary">
<h2>🧠 Memory</h2>
<div class="chips">${chips.map((chip) => `<span class="chip">${esc(chip)}</span>`).join('')}</div>
${projectChips.length ? `<h3 class="muted" style="margin:14px 0 6px;font-size:.84rem;">Projects in view</h3><div class="chips">${projectChips.join('')}</div>` : ''}
</section>`;
}

function renderMemoryObservationsSection(observations, nowMs) {
  if (observations.length === 0) {
    return `<section aria-label="Recent memory">
<h2>🕐 Recent observations</h2>
<p class="zero">claude-mem is installed but hasn't recorded anything yet.</p>
</section>`;
  }

  const items = observations.slice(0, ROW_CAP).map((entry) => {
    const ms = toMs(entry.ts);
    const when = timeAgo(ms ?? NaN, nowMs ?? NaN) || (ms !== null ? stamp(ms) : '');
    const project = entry.project ? ` <span class="chip">${esc(entry.project)}</span>` : '';
    return `<li>${when ? `<span class="muted mono">${esc(when)}</span> ` : ''}<span class="chip">${esc(entry.type)}</span> ${esc(entry.title)}${project}</li>`;
  });

  return `<section aria-label="Recent memory">
<h2>🕐 Recent observations</h2>
<ol>${items.join('')}</ol>
<p class="muted">Titles only — Commander never reads claude-mem's text, facts or narrative columns.</p>
</section>`;
}

/**
 * @param {object} model  a lib/memory-reader.js readMemoryModel() result
 * @param {{surface?: 'widget'|'artifact', now?: string|number|Date}} [opts]
 */
function renderMemoryTab(model, opts = {}) {
  const source = model && typeof model === 'object' ? model : {};
  if (source.available !== true) return renderMemoryUnavailableSection(source.unavailableReason);

  const observations = Array.isArray(source.observations) ? source.observations : [];
  const projects = Array.isArray(source.projects) ? source.projects : [];
  const counts =
    source.counts && typeof source.counts === 'object'
      ? source.counts
      : { last7d: 0, last30d: 0, shown: observations.length };
  const nowMs = nowMsFor(source, opts);

  return [
    renderMemorySummarySection(counts, projects),
    renderMemoryObservationsSection(observations, nowMs),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// History tab (v7.4.0 Phase 2)
//
// No new data source: the day rows come from telemetry Commander already
// writes (see history-reader.js). The charts reuse ./charts.js — the same
// builders Mission Control and Usage render — and the table is the part that
// is genuinely new: per-day cost, dispatches, tasks, failures and top skills.

function formatCost(value) {
  const n = Number.isFinite(value) ? value : 0;
  if (n === 0) return '$0';
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

function renderHistoryChartsSection(days) {
  // sparkline() wants oldest-first; `days` is newest-first for the table below.
  const oldestFirst = [...days].reverse();
  const cards = [
    [
      '💰 Cost / day',
      sparkline(
        oldestFirst.map((day) => ({ label: day.date, value: day.costUsd })),
        { label: 'Cost per day across the window', color: 'var(--mc-accent)' }
      ),
    ],
    [
      '🤖 Agents dispatched / day',
      sparkline(
        oldestFirst.map((day) => ({ label: day.date, value: day.agentsDispatched })),
        { label: 'Agents dispatched per day across the window', color: 'var(--mc-run)' }
      ),
    ],
  ];

  return `<section aria-label="History trends">
<h2>📈 Trends</h2>
<div class="chart-grid">${cards.map(([title, svg]) => `<div class="chart-card"><h3>${esc(title)}</h3>${svg}</div>`).join('')}</div>
</section>`;
}

function renderHistorySummarySection(totals, backbone, windowDays, topSkills) {
  const chips = [
    `📅 ${totals.activeDays} active day${totals.activeDays === 1 ? '' : 's'} in the last ${windowDays}`,
    `💰 ${formatCost(totals.costUsd)} spent`,
    `🤖 ${Math.round(totals.agentsDispatched)} dispatched`,
    `🧵 ${Math.round(totals.agentRuns)} agent run${Math.round(totals.agentRuns) === 1 ? '' : 's'} logged`,
    `📋 ${Math.round(totals.tasksCompleted)} task${Math.round(totals.tasksCompleted) === 1 ? '' : 's'} completed`,
    `⚠ ${Math.round(totals.toolFailures)} tool failure${Math.round(totals.toolFailures) === 1 ? '' : 's'}`,
  ];

  const backboneNote =
    backbone.dayCount > 0
      ? `Daily rollups retained from ${backbone.firstDate} to ${backbone.lastDate} (${backbone.dayCount} day${backbone.dayCount === 1 ? '' : 's'}). The detail logs rotate; these rollups do not.`
      : 'No daily rollups retained yet.';

  const skills = topSkills
    .slice(0, 10)
    .map((entry) => `<span class="chip">${esc(entry.skill)} · ${esc(entry.runs)}</span>`);

  return `<section aria-label="History summary">
<h2>📜 Last ${esc(windowDays)} days</h2>
<div class="chips">${chips.map((chip) => `<span class="chip">${esc(chip)}</span>`).join('')}</div>
${skills.length ? `<h3 class="muted" style="margin:14px 0 6px;font-size:.84rem;">Skills run in this window</h3><div class="chips">${skills.join('')}</div>` : ''}
<p class="muted" style="margin:12px 0 0;">${esc(backboneNote)}</p>
</section>`;
}

function renderHistoryTableSection(days) {
  const rows = days.slice(0, ROW_CAP).map((day) => {
    const skills = day.skills.length
      ? day.skills.map((entry) => `${entry.skill} ×${entry.runs}`).join(', ')
      : '—';
    return `<tr>
<td class="mono">${esc(day.date)}</td>
<td class="mono">${esc(formatCost(day.costUsd))}</td>
<td class="mono">${esc(Math.round(day.agentsDispatched))}</td>
<td class="mono">${esc(Math.round(day.agentRuns))}</td>
<td class="mono">${esc(Math.round(day.tasksCompleted))}</td>
<td class="mono">${esc(Math.round(day.toolFailures))}</td>
<td class="mono">${esc(Math.round(day.sessions))}</td>
<td>${esc(skills)}</td>
</tr>`;
  });

  const overflow =
    days.length > ROW_CAP
      ? `<p class="muted">…and ${days.length - ROW_CAP} earlier day${days.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  return `<section aria-label="History by day">
<h2>🗓️ By day</h2>
<div class="scroll"><table>
<thead><tr><th>Date</th><th>Cost</th><th>Dispatched</th><th>Agent runs</th><th>Tasks</th><th>Failures</th><th>Sessions</th><th>Top skills</th></tr></thead>
<tbody>${rows.join('')}</tbody>
</table></div>${overflow}
</section>`;
}

// A source that threw is reported as a muted footnote, never as an alarm: the
// rest of the timeline is still real, and the reader already degraded gracefully.
function renderHistoryErrorsNote(errors) {
  if (errors.length === 0) return '';
  const names = errors.map((entry) => entry.source).join(', ');
  return `<section aria-label="History source notes">
<p class="muted">Some history sources could not be read this time (${esc(names)}) — the days above are built from the rest.</p>
</section>`;
}

/**
 * @param {object} model  a lib/history-reader.js readHistoryModel() result
 * @param {{surface?: 'widget'|'artifact', now?: string|number|Date}} [opts]
 */
function renderHistoryTab(model, opts = {}) {
  void opts;
  const source = model && typeof model === 'object' ? model : {};
  const days = Array.isArray(source.days) ? source.days : [];
  const topSkills = Array.isArray(source.topSkills) ? source.topSkills : [];
  const errors = Array.isArray(source.errors) ? source.errors : [];
  const windowDays = Number.isFinite(source.windowDays) ? source.windowDays : 30;
  const backbone =
    source.backbone && typeof source.backbone === 'object'
      ? source.backbone
      : { firstDate: null, lastDate: null, dayCount: 0 };
  const totals =
    source.totals && typeof source.totals === 'object'
      ? source.totals
      : {
          costUsd: 0,
          agentsDispatched: 0,
          tasksCompleted: 0,
          toolFailures: 0,
          sessions: 0,
          agentRuns: 0,
          skillRuns: 0,
          activeDays: 0,
        };
  const hasAnySourceRow = source.hasAnySourceRow !== false;

  if (days.length === 0) {
    const doctorNote = hasAnySourceRow ? '' : ` ${DOCTOR_POINTER}`;
    return `<section aria-label="History">
<h2>📜 History</h2>
<p class="zero">📜 Nothing in the last ${esc(windowDays)} days — Commander records a day here once an agent runs, a task moves or a skill fires.${esc(doctorNote)}</p>
${renderHistoryErrorsNote(errors)}
</section>`;
  }

  return [
    renderHistorySummarySection(totals, backbone, windowDays, topSkills),
    renderHistoryChartsSection(days),
    renderHistoryTableSection(days),
    renderHistoryErrorsNote(errors),
  ].join('\n');
}

export {
  buildDeckHtml,
  // esc is exported for ./console-widget.js: the widget renders its own compact
  // fragments, but every surface must escape model-derived text with the SAME
  // function — a second copy is a second place for an escaping bug to hide.
  esc,
  formatDuration,
  renderHistoryTab,
  renderMemoryTab,
  renderMissionControlTab,
  renderSafetyTab,
  renderUsageTab,
  taskBucket,
};
