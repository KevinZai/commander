/**
 * deck-switcher.js — the shared "Commander decks" strip.
 *
 * Every Commander artifact (Cockpit, Mission Control, Usage & Cost, Safety) is a
 * separate, CSP-isolated self-contained page — so a user viewing one had no way
 * to know the others exist. This strip sits at the top of every deck, lists them
 * all as labelled chips, highlights the current one, and lets you jump.
 *
 * Cross-artifact navigation is impossible under the artifact CSP, so "jumping" =
 * copying the /ccc-* command that regenerates/opens that deck (matches the
 * copy-first UX everywhere else). Two render modes:
 *   - interactive: true  → chips are <button data-copy> (Cockpit + JS decks); the
 *                          host's delegated copy handler wires them.
 *   - interactive: false → chips are <span> with the command shown as plain text
 *                          (Mission Control snapshot has NO <script> — the command
 *                          is visible to type). Either way, users SEE every deck.
 *
 * Colours come entirely from brand-css.js tokens (var(--primary) etc.), so the
 * strip is theme-safe with zero per-artifact styling.
 */

export const DECKS = Object.freeze([
  { id: 'cockpit', icon: '🎛️', label: 'Cockpit', openCmd: '/ccc-browse', blurb: 'skills · agents · enhance · tools' },
  { id: 'mission-control', icon: '🖥️', label: 'Mission Control', openCmd: '/ccc-mission-control', blurb: 'live agent dashboard' },
  { id: 'usage', icon: '💰', label: 'Usage & Cost', openCmd: '/ccc-usage', blurb: 'burn · savings · cost by app' },
  { id: 'safety', icon: '🛡️', label: 'Safety', openCmd: '/ccc-safety', blurb: 'tool failures · blocked actions' },
]);

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export function deckStripCss() {
  return `
.deck-strip { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 0 16px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
.deck-strip .ds-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); margin-right: 4px; display: inline-flex; align-items: center; gap: 8px; }
.deck-strip .ds-label::before { content: ""; width: 16px; height: 1px; background: var(--primary); display: inline-block; }
.deck-chip { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 12px; padding: 6px 11px; border-radius: var(--radius-small, 6px); border: 1px solid var(--border-strong, var(--border)); background: var(--bg-card, transparent); color: var(--text-dim); cursor: pointer; transition: border-color .14s, background .14s, color .14s, transform .12s; text-decoration: none; }
.deck-chip:hover { border-color: var(--primary); color: var(--text); transform: translateY(-1px); }
.deck-chip .dc-cmd { color: var(--text-muted); font-size: 11px; }
.deck-chip.current { border-color: var(--primary); background: var(--primary-glow, rgba(255,107,71,.10)); color: var(--text); cursor: default; }
.deck-chip.current:hover { transform: none; }
.deck-chip.static { cursor: default; }
.deck-chip.static:hover { transform: none; border-color: var(--border-strong, var(--border)); color: var(--text-dim); }
`;
}

/**
 * @param {string} currentId  the id of the deck being rendered
 * @param {{interactive?: boolean}} [opts]
 */
export function deckStripHtml(currentId, opts = {}) {
  const interactive = opts.interactive !== false;
  const chips = DECKS.map((d) => {
    const isCurrent = d.id === currentId;
    const inner = `<span aria-hidden="true">${d.icon}</span> ${esc(d.label)}` +
      (isCurrent ? '' : ` <span class="dc-cmd">${esc(d.openCmd)}</span>`);
    if (isCurrent) {
      return `<span class="deck-chip current" title="you are here">${inner}</span>`;
    }
    if (interactive) {
      // The host wires [data-copy] → clipboard (same delegated handler as the rest of the artifact).
      return `<button type="button" class="deck-chip" data-copy="${esc(d.openCmd)}" title="copy ${esc(d.openCmd)} — paste in Claude to open ${esc(d.label)}">${inner}</button>`;
    }
    // No-JS artifact (MC snapshot): command is visible to type; not a live copy.
    return `<span class="deck-chip static" title="type ${esc(d.openCmd)} in Claude to open ${esc(d.label)}">${inner}</span>`;
  }).join('');
  return `<nav class="deck-strip" aria-label="Commander decks"><span class="ds-label">Commander decks</span>${chips}</nav>`;
}
