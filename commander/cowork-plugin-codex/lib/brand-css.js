/**
 * brand-css.js
 * Single shared source of truth for the CC Commander / commanderplugin.com
 * design system, consumed by every Mission Control surface (the plugin's
 * CSP-safe artifact snapshot AND the live dashboard). Presentation only —
 * no logic, no DOM, no fetch, zero dependencies.
 *
 * Exports:
 *   BRAND_TOKENS  — raw token values (colors, fonts, radii, shadow) for
 *                    any JS caller that needs a value outside of CSS.
 *   brandBaseCss()— a CSS string: `:root` custom-property declarations
 *                    (dark default) + a light adaptation via
 *                    `@media (prefers-color-scheme: light)` AND
 *                    `:root[data-theme="light"]`, with
 *                    `:root[data-theme="dark"]` declared LAST so an
 *                    explicit theme toggle always wins over both the
 *                    dark default and the light media query — plus a
 *                    small set of shared component primitives
 *                    (`.terminal-chrome`, `.terminal-header`,
 *                    `.terminal-dot`, status-color helpers, the brand
 *                    gradient text helper) any surface can reuse.
 *
 * No external references of any kind (no `@import`, no `url()`, no
 * http(s) links, no web fonts) — every consumer bakes this string
 * inline, so it must stay CSP-safe under a strict `style-src 'self'`
 * (or artifact-inline) policy with zero network fetches.
 *
 * Palette source: commanderplugin-com/assets/style.css (the marketing
 * site's dark terminal theme — amber primary + indigo accent). Light
 * mode promotes the `-dim` (darker) variant of primary/accent into the
 * foreground role so text stays WCAG AA against light surfaces; the
 * vivid values remain available as `--primary-dim`/`--accent-dim` for
 * hover/active states in both themes. Traffic-light red/yellow/green
 * and the rainbow/gradient decorations are intentionally constant
 * across themes — they're used as small graphic accents (dots, badges,
 * gradient text), not body text, so WCAG text-contrast rules don't
 * apply to them the way they do to `--text`/`--text-dim`/`--text-muted`.
 *
 * Core free forever — no license check, no tier gating.
 */

const DARK = Object.freeze({
  bg: '#0F0F1A',
  bgRaised: '#141422',
  bgCard: '#1A1A2E',
  bgTerminal: '#12121F',
  border: '#1E1E35',
  borderGlow: 'rgba(217, 119, 6, 0.2)',
  text: '#e0e0e0',
  textDim: '#888888',
  textMuted: '#555555',
  primary: '#D97706',
  primaryDim: '#B45309',
  primaryGlow: 'rgba(217, 119, 6, 0.13)',
  accent: '#6366F1',
  accentDim: '#4F46E5',
});

// Light mode promotes the darker "-dim" hue into the foreground role so
// primary/accent text keeps WCAG AA contrast against light surfaces —
// see module doc comment above.
const LIGHT = Object.freeze({
  bg: '#faf9f5',
  bgRaised: '#f2f0e9',
  bgCard: '#ffffff',
  bgTerminal: '#f6f5ee',
  border: '#e3ded0',
  borderGlow: 'rgba(217, 119, 6, 0.14)',
  text: '#1f1e1a',
  textDim: '#57534a',
  textMuted: '#78716c',
  primary: '#B45309',
  primaryDim: '#92400E',
  primaryGlow: 'rgba(180, 83, 9, 0.12)',
  accent: '#4F46E5',
  accentDim: '#4338CA',
});

const SHARED = Object.freeze({
  red: '#ff5f56',
  yellow: '#ffbd2e',
  green: '#27c93f',
  gradient: 'linear-gradient(135deg, #D97706, #6366F1)',
  rainbow:
    'linear-gradient(90deg, #ff0080, #ff8c00, #ffff00, #00ff80, #00c8ff, #8000ff, #ff0080)',
  fontMono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
  fontSans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  radiusCard: '8px',
  radiusSmall: '4px',
  radiusPill: '100px',
  shadowCard: '0 8px 32px rgba(0, 0, 0, 0.5)',
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

function brandBaseCss() {
  return `:root {
${varBlock(DARK)}
  --red: ${SHARED.red};
  --yellow: ${SHARED.yellow};
  --green-dot: ${SHARED.green};
  --gradient-brand: ${SHARED.gradient};
  --gradient-rainbow: ${SHARED.rainbow};
  --font-mono: ${SHARED.fontMono};
  --font-sans: ${SHARED.fontSans};
  --radius-card: ${SHARED.radiusCard};
  --radius-small: ${SHARED.radiusSmall};
  --radius-pill: ${SHARED.radiusPill};
  --shadow-card: ${SHARED.shadowCard};
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
  gap: 6px;
  padding: 10px 14px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border);
}

.terminal-dot {
  width: 10px;
  height: 10px;
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
  font-size: 0.7rem;
  color: var(--text-muted);
}

.terminal-body {
  font-family: var(--font-mono);
  color: var(--text);
}

.brand-gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.status-running { color: var(--accent); }
.status-done { color: var(--green-dot); }
.status-failed { color: var(--red); }
.status-waiting,
.status-awaiting { color: var(--yellow); }
`;
}

export { BRAND_TOKENS, brandBaseCss };
