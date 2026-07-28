/**
 * console-widget.js
 * The INLINE surface of the Commander Console (v7.4.0 Phase 1).
 *
 * buildConsoleWidgetHtml(model, { tab, now }) renders the 680px visualize-MCP
 * widget: a compact stats strip over the composed console model, one compact tab
 * body, fixed-template action chips, and the free-text prompt bar that reaches
 * the LIVE session through the widget host's global `sendPrompt(text)`.
 *
 * ─── Why the widget renders its own compact fragments ──────────────────────
 * The rule for Phase 1 was "one renderer per fragment, no copied markup". This
 * file therefore imports the console model and `esc()` from console-render.js,
 * but NOT the deck tab renderers, and `buildDeckHtml()` still rejects
 * surface:'widget'. Two reasons, both structural rather than stylistic:
 *
 *   1. The artifact tab bodies are a DIFFERENT fragment, not the same one at a
 *      smaller size — full rosters, event feeds and chart strips laid out for a
 *      responsive page. What ships here (4 stat tiles + a ≤5-row digest) is new
 *      markup that exists exactly once, in this file. Nothing is duplicated;
 *      console-render.js remains the only place a deck section is written.
 *   2. Those bodies are unstyled without `brandBaseCss()` + the per-deck CSS,
 *      and `brandBaseCss()` emits `:root { … }` blocks that set `color-scheme`
 *      and ~40 custom properties. In a standalone artifact document that is
 *      correct; inside a widget embedded in the chat page it can reach the host
 *      document root. So the widget declares no `:root` rules at all — every
 *      selector is scoped under `.ccc-console`, colors come from the host's
 *      theme variables with neutral fallbacks, and the background stays
 *      transparent.
 *
 * ─── Security: fixed-template chips only (CWE-441 confused deputy) ─────────
 * `sendPrompt()` executes in the user's live session with the user's authority.
 * A chip payload assembled from telemetry — an agent name, a task subject, a
 * branch, a file path, an error string — would let anything that can append a
 * line to a log in ~/.claude/commander compose an instruction the user appears
 * to have typed. So:
 *
 *   - every chip payload in this file is a compile-time literal (see CHIPS /
 *     DECK_CHIPS / CONSOLE_CHIPS / LAUNCH_CHIPS). No interpolation, ever.
 *   - the prompt bar sends exactly what the user typed, never a pre-fill.
 *   - model-derived strings are rendered as escaped TEXT only, and never reach
 *     a `data-prompt` attribute.
 *
 * `sanitizePromptText()` guards the free-text path: newlines stripped (a
 * multi-line paste can otherwise read as several turns), whitespace collapsed,
 * capped at 500 characters. It is exported for unit tests AND inlined into the
 * widget script via `Function.prototype.toString()`, so the browser runs the
 * exact function the tests assert on rather than a second copy that can drift.
 * That inlining is why the function references no module-scope binding and
 * carries its 500 as a literal — keep it self-contained.
 *
 * Determinism: every timestamp comes from the model or the `now` argument.
 * Zero dependencies beyond this plugin's own lib/, ESM, pure.
 * Core free forever — no license check, no tier gating.
 */
import { esc } from './console-render.js';

const WIDGET_WIDTH_PX = 680;
const AGENT_ROWS = 5;
const DIGEST_ROWS = 3;
const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize free text before it is handed to sendPrompt().
 *
 * MUST stay self-contained (no module-scope references, no imports): this
 * function's source is inlined verbatim into the widget's inline script so the
 * browser and the test suite exercise one implementation.
 *
 * @param {unknown} text
 * @returns {string} single-line, whitespace-collapsed, ≤500 chars
 */
function sanitizePromptText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

// ---------------------------------------------------------------------------
// Chips. EVERY `prompt` below is a literal and must stay one — see the header.
// `label` is what the user reads; `prompt` is shown next to it so the exact
// command is visible BEFORE the click.

const CHIPS = Object.freeze([
  { label: '🩺 Health check', prompt: '/ccc-doctor' },
  { label: '🧭 What’s next', prompt: '/ccc-suggest' },
  { label: '💰 Usage', prompt: '/ccc-usage' },
  { label: '🔎 Find a skill', prompt: '/ccc-browse' },
]);

const DECK_CHIPS = Object.freeze([
  { label: '🎛️ Mission Control', prompt: '/ccc-mission-control' },
  { label: '🚀 Cockpit', prompt: '/ccc-browse' },
  { label: '💰 Usage', prompt: '/ccc-usage' },
  { label: '🛡️ Safety', prompt: '/ccc-safety' },
]);

const CONSOLE_CHIPS = Object.freeze([
  { label: '🔄 Refresh', prompt: '/ccc-console refresh' },
  { label: '📤 Publish snapshot', prompt: '/ccc-console publish' },
]);

const LAUNCH_CHIPS = Object.freeze([
  { label: '📋 Plan a feature', prompt: '/ccc-plan' },
  { label: '🔨 Build something', prompt: '/ccc-build' },
  { label: '🔍 Review a branch', prompt: '/ccc-review' },
  { label: '🚢 Ship it', prompt: '/ccc-ship' },
  { label: '🩻 Project x-ray', prompt: '/ccc-xray' },
  { label: '🤖 Spawn an agent', prompt: '/ccc-spawn' },
  { label: '🛰️ Fleet fan-out', prompt: '/ccc-fleet' },
  { label: '🎓 Learn a domain', prompt: '/ccc-learn' },
]);

const TABS = Object.freeze([
  { id: 'overview', label: 'Overview', prompt: '/ccc-console overview' },
  { id: 'usage', label: 'Usage', prompt: '/ccc-console usage' },
  { id: 'safety', label: 'Safety', prompt: '/ccc-console safety' },
  { id: 'launch', label: 'Launch', prompt: '/ccc-console launch' },
]);

const TAB_IDS = new Set(TABS.map((entry) => entry.id));

// ---------------------------------------------------------------------------
// Helpers. Every number that reaches the DOM goes through one of these — the
// widget design system asks for rounded values, and an unrounded float is also
// how a 17-significant-digit cost ends up wrapping a 680px tile.

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

function count(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : '—';
}

function usd(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 100) return `$${Math.round(value)}`;
  return `$${value.toFixed(2)}`;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

// ---------------------------------------------------------------------------
// Chip + card primitives. `prompt` is always a literal from the tables above,
// so the data-prompt attribute can never carry telemetry; esc() is applied
// anyway so this stays correct if a future chip table is ever generated.

function renderChip(chip, extraClass = '') {
  const cls = `ccc-chip${extraClass ? ` ${extraClass}` : ''}`;
  return `<button class="${cls}" type="button" data-prompt="${esc(chip.prompt)}"><span class="ccc-chip-label">${esc(chip.label)}</span><code>${esc(chip.prompt)}</code></button>`;
}

function renderChipRow(chips, { title, extraClass = '' } = {}) {
  const heading = title ? `<h2 class="ccc-h2">${esc(title)}</h2>` : '';
  return `<section class="ccc-block">${heading}<div class="ccc-chips">${chips
    .map((chip) => renderChip(chip, extraClass))
    .join('')}</div></section>`;
}

function renderZeroState(message, pointer) {
  return `<div class="ccc-zero"><p>${esc(message)}</p>${
    pointer ? `<p class="ccc-dim">${esc(pointer)}</p>` : ''
  }</div>`;
}

function renderStamp(sectionModel, nowMs) {
  const ms = sectionModel && typeof sectionModel === 'object' ? toMs(sectionModel.dataThroughMs) : null;
  if (ms === null) return '<p class="ccc-stamp">Data through —</p>';
  const stale = Number.isFinite(nowMs) && nowMs - ms > STALE_MS;
  return `<p class="ccc-stamp${stale ? ' ccc-stale' : ''}">Data through ${esc(stamp(ms))}${
    stale ? ' · stale — run /ccc-doctor' : ''
  }</p>`;
}

// ---------------------------------------------------------------------------
// Stats strip — four tiles over the composed model. A null section (its reader
// threw, see console-model.js) and an empty one both render "—": the widget
// never invents a zero it did not measure.

function taskCounts(tasks) {
  let open = 0;
  let done = 0;
  for (const task of list(tasks)) {
    const status = String(task && task.status ? task.status : '').toLowerCase();
    if (/(done|complete|closed|resolved|finished|shipped|merged)/.test(status)) done += 1;
    else open += 1;
  }
  return { open, done };
}

function latestCostDay(usage) {
  const series = usage && typeof usage === 'object' ? list(usage.costSeries) : [];
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const entry = series[index];
    if (entry && Number.isFinite(entry.value)) return entry;
  }
  return null;
}

function renderStatsStrip(model, nowMs) {
  const mission = model.missionControl;
  const usage = model.usage;

  const agents = mission ? list(mission.agents) : null;
  const activeAgents = agents
    ? agents.filter((agent) => agent && (agent.status === 'running' || agent.status === 'awaiting_permission')).length
    : null;
  const tasks = mission ? taskCounts(mission.tasks) : null;
  const costDay = latestCostDay(usage);
  const skills = mission ? list(mission.topSkills) : null;
  const skillsLabel = skills === null ? '—' : skills.length >= 10 ? '10+' : String(skills.length);

  const tiles = [
    {
      label: 'Agents active',
      value: activeAgents === null ? '—' : count(activeAgents),
      sub: agents === null ? 'no data' : `${count(agents.length)} tracked`,
    },
    {
      label: 'Tasks open',
      value: tasks === null ? '—' : count(tasks.open),
      sub: tasks === null ? 'no data' : `${count(tasks.done)} done`,
    },
    {
      label: 'Cost / day',
      value: costDay ? usd(costDay.value) : '—',
      sub: costDay && costDay.label ? String(costDay.label) : 'no data',
    },
    {
      label: 'Skills used',
      value: skillsLabel,
      sub: skills === null ? 'no data' : 'last 30d',
    },
  ];

  const cells = tiles
    .map(
      (tile) =>
        `<div class="ccc-tile"><span class="ccc-tile-label">${esc(tile.label)}</span><strong class="ccc-tile-value">${esc(
          tile.value
        )}</strong><span class="ccc-tile-sub">${esc(tile.sub)}</span></div>`
    )
    .join('');

  const generated = toMs(model.meta && model.meta.generatedAt);
  const through = toMs(model.meta && model.meta.dataThrough);
  const stale = through !== null && Number.isFinite(nowMs) && nowMs - through > STALE_MS;
  const headerStamp = through === null ? 'Data through —' : `Data through ${stamp(through)}`;

  return `<section class="ccc-block"><div class="ccc-stats">${cells}</div><p class="ccc-stamp${
    stale ? ' ccc-stale' : ''
  }">${esc(headerStamp)}${Number.isFinite(generated) ? ` · rendered ${esc(stamp(generated))}` : ''}${
    stale ? ' · stale — run /ccc-doctor' : ''
  }</p></section>`;
}

// ---------------------------------------------------------------------------
// Compact tab bodies. Model strings are TEXT — escaped, never a chip payload.

const STATUS_LABEL = Object.freeze({
  running: 'working',
  awaiting_permission: '⚠ needs approval',
  done: 'finished',
  failed: 'hit a problem',
  stale: 'stale',
});

function renderOverviewTab(model, nowMs) {
  const mission = model.missionControl;
  if (!mission) {
    return renderZeroState(
      'Mission Control telemetry is unavailable.',
      'Run /ccc-doctor to check your hooks are wired.'
    );
  }

  const agents = list(mission.agents);
  const awaiting = list(mission.awaitingPermission);
  const summary = typeof mission.summary === 'string' && mission.summary.trim() ? mission.summary.trim() : '';

  if (agents.length === 0 && awaiting.length === 0 && !summary) {
    return `${renderZeroState(
      'No agent activity yet.',
      'Spawn one with /ccc-spawn, or fan out with /ccc-fleet, and this lights up.'
    )}${renderStamp(mission, nowMs)}`;
  }

  const awaitingHtml = awaiting.length
    ? `<div class="ccc-alert"><strong>${esc(count(awaiting.length))} waiting for approval</strong><ul class="ccc-list">${awaiting
        .slice(0, DIGEST_ROWS)
        .map(
          (row) =>
            `<li>${esc(row && row.subject ? row.subject : 'approval request')} <span class="ccc-dim">${esc(
              row && row.session_id ? `session ${row.session_id}` : ''
            )}</span></li>`
        )
        .join('')}</ul><p class="ccc-dim">Switch to that session to approve — the console cannot approve for you.</p></div>`
    : '';

  const rows = agents.slice(0, AGENT_ROWS).map((agent) => {
    const name = agent && agent.name ? agent.name : 'agent';
    const status = agent && agent.status ? agent.status : '';
    const label = Object.hasOwn(STATUS_LABEL, status) ? STATUS_LABEL[status] : status || 'unknown';
    const task = agent && agent.currentTask ? agent.currentTask : '';
    return `<li><span class="ccc-row-name">${esc(agent && agent.emoji ? agent.emoji : '🤖')} ${esc(
      name
    )}</span><span class="ccc-row-status">${esc(label)}</span><span class="ccc-dim ccc-row-task">${esc(task)}</span></li>`;
  });

  const more = agents.length > AGENT_ROWS ? `<p class="ccc-dim">+${esc(count(agents.length - AGENT_ROWS))} more — open /ccc-mission-control for the full roster.</p>` : '';

  return `${summary ? `<p class="ccc-summary">${esc(summary)}</p>` : ''}${awaitingHtml}${
    rows.length ? `<ul class="ccc-rows">${rows.join('')}</ul>${more}` : ''
  }${renderStamp(mission, nowMs)}`;
}

function renderUsageTab(model, nowMs) {
  const usage = model.usage;
  if (!usage) {
    return renderZeroState('Usage telemetry is unavailable.', 'Run /ccc-doctor to check your hooks are wired.');
  }
  if (!usage.hasAnySourceRow) {
    return `${renderZeroState(
      'No usage data yet.',
      'Dispatch some work — savings and cost land here once agents run.'
    )}${renderStamp(usage, nowMs)}`;
  }

  const byApp = list(usage.costByApp)
    .slice(0, DIGEST_ROWS)
    .map(
      (row) =>
        `<li><span class="ccc-row-name">${esc(row && row.sourceApp ? row.sourceApp : 'unknown')}</span><span class="ccc-row-status">${esc(
          usd(row && row.costUsd)
        )}</span></li>`
    );

  return `<div class="ccc-pair"><div><span class="ccc-tile-label">Saved</span><strong class="ccc-tile-value">${esc(
    usd(usage.totalSavedUsd)
  )}</strong></div><div><span class="ccc-tile-label">Dispatches</span><strong class="ccc-tile-value">${esc(
    count(usage.totalDispatches)
  )}</strong></div><div><span class="ccc-tile-label">Spent</span><strong class="ccc-tile-value">${esc(
    usd(usage.totalActualUsd)
  )}</strong></div></div>${
    byApp.length ? `<h2 class="ccc-h2">Cost by app</h2><ul class="ccc-rows">${byApp.join('')}</ul>` : ''
  }${renderStamp(usage, nowMs)}`;
}

function renderSafetyTab(model, nowMs) {
  const safety = model.safety;
  if (!safety) {
    return renderZeroState('Safety telemetry is unavailable.', 'Run /ccc-doctor to check your hooks are wired.');
  }
  if (!safety.hasAnySourceRow) {
    return `${renderZeroState(
      'No safety events recorded yet.',
      'Blocked and auto-fixed actions appear here once the gate hooks fire.'
    )}${renderStamp(safety, nowMs)}`;
  }

  const decisions = safety.decisions && typeof safety.decisions === 'object' ? safety.decisions : {};
  const failures = safety.toolFailures && typeof safety.toolFailures === 'object' ? safety.toolFailures : {};
  const topTools = list(failures.byTool)
    .slice(0, DIGEST_ROWS)
    .map(
      (row) =>
        `<li><span class="ccc-row-name">${esc(row && row.tool ? row.tool : 'tool')}</span><span class="ccc-row-status">${esc(
          count(row && row.count)
        )}</span></li>`
    );

  return `<div class="ccc-pair"><div><span class="ccc-tile-label">Blocked</span><strong class="ccc-tile-value">${esc(
    count(decisions.blocked)
  )}</strong></div><div><span class="ccc-tile-label">Auto-fixed</span><strong class="ccc-tile-value">${esc(
    count(decisions.autofixed)
  )}</strong></div><div><span class="ccc-tile-label">Approved</span><strong class="ccc-tile-value">${esc(
    count(decisions.approved)
  )}</strong></div></div>${
    topTools.length ? `<h2 class="ccc-h2">Tool failure hotspots</h2><ul class="ccc-rows">${topTools.join('')}</ul>` : ''
  }${renderStamp(safety, nowMs)}`;
}

function renderLaunchTab() {
  return `<p class="ccc-summary">Run a Commander workflow without leaving this panel — each chip shows the exact command it sends.</p>${renderChipRow(
    LAUNCH_CHIPS
  )}`;
}

const TAB_BODIES = Object.freeze({
  overview: renderOverviewTab,
  usage: renderUsageTab,
  safety: renderSafetyTab,
  launch: (_model, _nowMs) => renderLaunchTab(),
});

// ---------------------------------------------------------------------------
// Shell

function renderTabStrip(activeTab) {
  return `<nav class="ccc-tabs">${TABS.map((entry) => {
    const active = entry.id === activeTab;
    return `<button class="ccc-tab${active ? ' is-active' : ''}" type="button" data-prompt="${esc(
      entry.prompt
    )}"${active ? ' aria-current="page"' : ''}>${esc(entry.label)}</button>`;
  }).join('')}</nav>`;
}

const WIDGET_CSS = `
.ccc-console { box-sizing: border-box; width: 100%; max-width: ${WIDGET_WIDTH_PX}px; background: transparent; color: var(--text-primary, inherit); font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif); font-size: 13px; line-height: 1.45; }
.ccc-console *, .ccc-console *::before, .ccc-console *::after { box-sizing: border-box; }
.ccc-console h1, .ccc-console h2, .ccc-console p, .ccc-console ul { margin: 0; padding: 0; }
.ccc-console ul { list-style: none; }
.ccc-head { display: flex; align-items: baseline; gap: 8px; padding-bottom: 8px; border-bottom: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); }
.ccc-h1 { font-size: 14px; font-weight: 600; letter-spacing: 0.01em; }
.ccc-console .ccc-accent { color: #FF6B47; }
.ccc-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 0; }
.ccc-tab { font: inherit; font-size: 12px; padding: 4px 10px; border: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); border-radius: 999px; background: transparent; color: var(--text-secondary, #6E6E68); cursor: pointer; }
.ccc-tab.is-active { color: var(--text-primary, inherit); border-color: #FF6B47; }
.ccc-block { padding: 10px 0; border-top: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); }
.ccc-h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary, #6E6E68); padding-bottom: 6px; }
.ccc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ccc-tile { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); border-radius: 6px; }
.ccc-tile-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary, #6E6E68); }
.ccc-tile-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ccc-tile-sub { font-size: 11px; color: var(--text-secondary, #6E6E68); }
.ccc-pair { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-bottom: 8px; }
.ccc-summary { padding-bottom: 8px; }
.ccc-rows { display: flex; flex-direction: column; gap: 4px; }
.ccc-rows li { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; border-bottom: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.22)); }
.ccc-row-name { font-weight: 500; }
.ccc-row-status { font-size: 11px; color: var(--text-secondary, #6E6E68); font-variant-numeric: tabular-nums; }
.ccc-row-task { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ccc-list { display: flex; flex-direction: column; gap: 2px; padding: 4px 0; }
.ccc-alert { padding: 8px 10px; margin-bottom: 8px; border: 0.5px solid #FF6B47; border-radius: 6px; }
.ccc-zero { padding: 12px 0; }
.ccc-dim { color: var(--text-secondary, #6E6E68); font-size: 11px; }
.ccc-stamp { padding-top: 8px; font-size: 11px; color: var(--text-secondary, #6E6E68); }
.ccc-stamp.ccc-stale { color: #FF6B47; }
.ccc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ccc-chip { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; padding: 5px 10px; border: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); border-radius: 6px; background: transparent; color: var(--text-primary, inherit); cursor: pointer; text-align: left; }
.ccc-chip code { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 11px; color: var(--text-secondary, #6E6E68); }
.ccc-ask { display: flex; gap: 6px; padding: 10px 0; border-top: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); }
.ccc-ask input { flex: 1; font: inherit; font-size: 13px; padding: 7px 10px; border: 0.5px solid var(--border-default, rgba(128, 128, 128, 0.28)); border-radius: 6px; background: transparent; color: var(--text-primary, inherit); }
.ccc-ask button { font: inherit; font-size: 13px; padding: 7px 14px; border: 0.5px solid #FF6B47; border-radius: 6px; background: transparent; color: #FF6B47; cursor: pointer; }
.ccc-foot { padding-top: 8px; font-size: 11px; color: var(--text-secondary, #6E6E68); }
`;

// The inline script: chip clicks and the prompt bar both funnel through one
// send() that sanitizes and guards on the host global. sanitizePromptText is
// injected as source (see header) so browser and tests share one implementation.
function widgetScript() {
  return `<script>
(function () {
  var root = document.getElementById('ccc-console');
  if (!root) return;
  var sanitizePromptText = ${sanitizePromptText.toString()};
  function send(text) {
    var clean = sanitizePromptText(text);
    if (!clean) return;
    if (typeof window.sendPrompt === 'function') window.sendPrompt(clean);
  }
  root.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-prompt]') : null;
    if (!target || !root.contains(target)) return;
    send(target.getAttribute('data-prompt'));
  });
  var input = root.querySelector('.ccc-ask input');
  var button = root.querySelector('.ccc-ask button');
  function submit() {
    if (!input) return;
    var value = input.value;
    input.value = '';
    send(value);
  }
  if (button) button.addEventListener('click', submit);
  if (input) {
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });
  }
})();
</script>`;
}

/**
 * Render the inline Commander Console widget.
 *
 * @param {object} model  a readConsoleModel() result: {missionControl, usage, safety, meta, errors}
 * @param {{tab?: 'overview'|'usage'|'safety'|'launch', now?: string|number|Date}} [opts]
 * @returns {string} widget HTML (no doctype/html/head/body — the host supplies those)
 */
function buildConsoleWidgetHtml(model, { tab = 'overview', now } = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const activeTab = TAB_IDS.has(tab) ? tab : 'overview';
  const nowMs = toMs(now) ?? toMs(source.meta && source.meta.generatedAt);

  return `<style>${WIDGET_CSS}</style>
<div class="ccc-console" id="ccc-console">
<header class="ccc-head"><h1 class="ccc-h1"><span class="ccc-accent">▮</span> Commander Console</h1><span class="ccc-dim">local only — nothing published</span></header>
${renderTabStrip(activeTab)}
${renderStatsStrip(source, nowMs)}
<section class="ccc-block">${TAB_BODIES[activeTab](source, nowMs)}</section>
${renderChipRow(CHIPS, { title: 'Quick actions' })}
${renderChipRow(DECK_CHIPS, { title: 'Open a deck' })}
${renderChipRow(CONSOLE_CHIPS, { title: 'Console' })}
<div class="ccc-ask"><input type="text" aria-label="Ask Claude" placeholder="Ask Claude anything…" /><button type="button">Ask ↗</button></div>
<p class="ccc-foot">Built from local logs in ~/.claude/commander. Chips send the exact command shown; the box sends exactly what you type.</p>
</div>
${widgetScript()}`;
}

export { buildConsoleWidgetHtml, sanitizePromptText };
