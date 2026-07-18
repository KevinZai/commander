/**
 * brand-css.js
 * Single shared source of truth for the CC Commander / commanderplugin.com
 * design system, consumed by every Commander surface (the Cockpit artifact,
 * the Mission Control snapshot artifact AND the live dashboard). Presentation
 * only — no logic, no DOM, no fetch, zero dependencies.
 *
 * Exports:
 *   BRAND_TOKENS   — raw token values for any JS caller needing a value
 *                    outside CSS.
 *   brandBaseCss() — a CSS string: `:root` custom properties (dark default)
 *                    + a warm-paper light adaptation via
 *                    `@media (prefers-color-scheme: light)` AND
 *                    `:root[data-theme="light"]`, with
 *                    `:root[data-theme="dark"]` LAST so an explicit toggle
 *                    always wins over both — plus shared component
 *                    primitives (terminal chrome, traffic-light dots,
 *                    the `.eyebrow` label, status colors, gradient text).
 *
 * No external references of any kind (no `@import`, no `url()`, no http
 * links) — the webfont *names* (Inter / JetBrains Mono) are listed first
 * in the stacks so a machine that has them installed uses them, but there
 * is NO network fetch, so the string stays CSP-safe under a strict inline
 * policy and degrades to the system stack with zero flash.
 *
 * Palette source: commanderplugin.com (the marketing site's dark terminal
 * theme) — near-black ground, warm off-white text, coral `#FF6B47` as the
 * single action accent, tan `#D4A574` as the quiet secondary, and terminal
 * green/cyan/yellow reserved for status. The light theme promotes a darker
 * coral into the action role so it keeps WCAG AA against warm-paper
 * surfaces. Status hues are graphic accents (dots, pills), not body text,
 * so text-contrast rules apply to `--text*`, not to them.
 *
 * Token names are kept stable across releases — Mission Control consumes
 * `--bg`, `--primary`, `--accent`, `--text`, `--green-dot`, `--red`,
 * `--yellow`, `--border` by name; this file only remaps their *values* to
 * the site palette.
 *
 * Core free forever — no license check, no tier gating.
 */

const DARK = Object.freeze({
  bg: '#0F0F0F',
  bgRaised: '#141414',
  bgCard: '#181818',
  bgTerminal: '#141414',
  border: 'rgba(245, 245, 240, 0.08)',
  borderStrong: 'rgba(245, 245, 240, 0.14)',
  borderStrongest: 'rgba(245, 245, 240, 0.22)',
  borderGlow: 'rgba(255, 107, 71, 0.22)',
  text: '#F5F5F0',
  textDim: '#A8A8A0',
  textMuted: '#6E6E68',
  primary: '#FF6B47',
  primaryDim: '#FF7A59',
  primaryGlow: 'rgba(255, 107, 71, 0.13)',
  accent: '#D4A574',
  accentDim: '#C29257',
});

// Warm-paper light theme. Coral darkens into the action role for WCAG AA on
// light surfaces; tan darkens to a readable bronze; borders warm.
const LIGHT = Object.freeze({
  bg: '#F7F6F1',
  bgRaised: '#FBFAF6',
  bgCard: '#FFFFFF',
  bgTerminal: '#F1EFE8',
  border: 'rgba(26, 26, 20, 0.10)',
  borderStrong: 'rgba(26, 26, 20, 0.16)',
  borderStrongest: 'rgba(26, 26, 20, 0.24)',
  borderGlow: 'rgba(214, 74, 42, 0.18)',
  text: '#1A1A16',
  textDim: '#5A5A50',
  textMuted: '#8A8A7E',
  primary: '#D64A2A',
  primaryDim: '#B33C20',
  primaryGlow: 'rgba(214, 74, 42, 0.10)',
  accent: '#9A6E38',
  accentDim: '#7E5A2C',
});

const SHARED = Object.freeze({
  red: '#FF5F56',
  yellow: '#E6C76B',
  green: '#6BCF7F',
  cyan: '#7FD4D4',
  tan: '#D4A574',
  gradient: 'linear-gradient(135deg, #FF6B47, #D4A574)',
  rainbow:
    'linear-gradient(90deg, #ff0080, #ff8c00, #ffff00, #00ff80, #00c8ff, #8000ff, #ff0080)',
  fontMono:
    "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
  fontSans:
    "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  radiusCard: '10px',
  radiusSmall: '6px',
  radiusPill: '100px',
  shadowCard: '0 10px 34px rgba(0, 0, 0, 0.45)',
});

const BRAND_TOKENS = Object.freeze({
  dark: DARK,
  light: LIGHT,
  ...SHARED,
});

function varBlock(tokens) {
  return `  --bg: ${tokens.bg};
  --bg-raised: ${tokens.bgRaised};
  --bg-card: ${tokens.bgCard};
  --bg-terminal: ${tokens.bgTerminal};
  --border: ${tokens.border};
  --border-strong: ${tokens.borderStrong};
  --border-strongest: ${tokens.borderStrongest};
  --border-glow: ${tokens.borderGlow};
  --text: ${tokens.text};
  --text-dim: ${tokens.textDim};
  --text-muted: ${tokens.textMuted};
  --primary: ${tokens.primary};
  --primary-dim: ${tokens.primaryDim};
  --primary-glow: ${tokens.primaryGlow};
  --accent: ${tokens.accent};
  --accent-dim: ${tokens.accentDim};`;
}

function sharedBlock() {
  return `  --red: ${SHARED.red};
  --yellow: ${SHARED.yellow};
  --green-dot: ${SHARED.green};
  --term-cyan: ${SHARED.cyan};
  --accent-2: ${SHARED.tan};
  --gradient-brand: ${SHARED.gradient};
  --gradient-rainbow: ${SHARED.rainbow};
  --font-mono: ${SHARED.fontMono};
  --font-sans: ${SHARED.fontSans};
  --radius-card: ${SHARED.radiusCard};
  --radius-small: ${SHARED.radiusSmall};
  --radius-pill: ${SHARED.radiusPill};
  --shadow-card: ${SHARED.shadowCard};`;
}

function brandBaseCss() {
  return `:root {
${varBlock(DARK)}
${sharedBlock()}
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root {
${varBlock(DARK)}
    color-scheme: dark;
  }
}

@media (prefers-color-scheme: light) {
  :root {
${varBlock(LIGHT)}
    color-scheme: light;
  }
}

:root[data-theme="light"] {
${varBlock(LIGHT)}
  color-scheme: light;
}

:root[data-theme="dark"] {
${varBlock(DARK)}
  color-scheme: dark;
}

.terminal-chrome {
  background: var(--bg-terminal);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.013);
  border-bottom: 1px solid var(--border);
}

.terminal-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.terminal-dot.red { background: var(--red); }
.terminal-dot.yellow { background: var(--yellow); }
.terminal-dot.green { background: var(--green-dot); }

.terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.eyebrow::before {
  content: "";
  width: 18px;
  height: 1px;
  background: var(--primary);
}

.brand-gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.status-running { color: var(--primary); }
.status-done { color: var(--green-dot); }
.status-failed { color: var(--red); }
.status-waiting,
.status-awaiting { color: var(--yellow); }
`;
}

export { BRAND_TOKENS, brandBaseCss };
