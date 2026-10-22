import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BRAND_TOKENS, brandBaseCss } from '../cowork-plugin/lib/brand-css.js';

describe('brand-css — BRAND_TOKENS', () => {
  it('exposes dark and light color tables with the expected keys', () => {
    const expectedKeys = [
      'bg',
      'bgRaised',
      'bgCard',
      'bgTerminal',
      'border',
      'borderGlow',
      'text',
      'textDim',
      'textMuted',
      'primary',
      'primaryDim',
      'primaryGlow',
      'accent',
      'accentDim',
    ];
    for (const theme of ['dark', 'light']) {
      assert.ok(BRAND_TOKENS[theme], `BRAND_TOKENS.${theme} present`);
      for (const key of expectedKeys) {
        assert.ok(
          Object.hasOwn(BRAND_TOKENS[theme], key),
          `BRAND_TOKENS.${theme}.${key} present`
        );
        assert.equal(typeof BRAND_TOKENS[theme][key], 'string');
        assert.ok(BRAND_TOKENS[theme][key].length > 0);
      }
    }
  });

  it('exposes shared constants: traffic-light colors, gradients, fonts, radii, shadow', () => {
    for (const key of [
      'red',
      'yellow',
      'green',
      'gradient',
      'rainbow',
      'fontMono',
      'fontSans',
      'radiusCard',
      'radiusSmall',
      'radiusPill',
      'shadowCard',
    ]) {
      assert.ok(Object.hasOwn(BRAND_TOKENS, key), `BRAND_TOKENS.${key} present`);
      assert.equal(typeof BRAND_TOKENS[key], 'string');
      assert.ok(BRAND_TOKENS[key].length > 0);
    }
  });

  it('dark and light tables are frozen and distinct', () => {
    assert.ok(Object.isFrozen(BRAND_TOKENS.dark));
    assert.ok(Object.isFrozen(BRAND_TOKENS.light));
    assert.notEqual(BRAND_TOKENS.dark.bg, BRAND_TOKENS.light.bg);
    assert.notEqual(BRAND_TOKENS.dark.text, BRAND_TOKENS.light.text);
  });
});

describe('brand-css — brandBaseCss()', () => {
  it('returns a non-empty CSS string', () => {
    const css = brandBaseCss();
    assert.equal(typeof css, 'string');
    assert.ok(css.length > 200, 'non-trivial CSS output');
  });

  it('declares :root custom properties for every core token', () => {
    const css = brandBaseCss();
    for (const varName of [
      '--bg:',
      '--bg-raised:',
      '--bg-card:',
      '--bg-terminal:',
      '--border:',
      '--border-glow:',
      '--text:',
      '--text-dim:',
      '--text-muted:',
      '--primary:',
      '--primary-dim:',
      '--primary-glow:',
      '--accent:',
      '--accent-dim:',
      '--red:',
      '--yellow:',
      '--green-dot:',
      '--font-mono:',
      '--font-sans:',
      '--radius-card:',
      '--radius-small:',
      '--radius-pill:',
      '--shadow-card:',
    ]) {
      assert.ok(css.includes(varName), `missing custom property ${varName}`);
    }
  });

  it('adapts via prefers-color-scheme AND a data-theme toggle, dark declared last', () => {
    const css = brandBaseCss();
    assert.ok(css.includes('@media (prefers-color-scheme: dark)'));
    assert.ok(css.includes('@media (prefers-color-scheme: light)'));
    assert.ok(css.includes(':root[data-theme="light"]'));
    assert.ok(css.includes(':root[data-theme="dark"]'));
    // The explicit dark toggle must be declared LAST so it always wins.
    assert.ok(
      css.indexOf(':root[data-theme="dark"]') > css.indexOf(':root[data-theme="light"]'),
      'dark toggle block must come after the light toggle block'
    );
  });

  it('includes shared component primitives (terminal chrome, status helpers)', () => {
    const css = brandBaseCss();
    assert.ok(css.includes('.terminal-chrome'));
    assert.ok(css.includes('.terminal-header'));
    assert.ok(css.includes('.terminal-dot'));
    assert.ok(css.includes('.terminal-dot.red'));
    assert.ok(css.includes('.terminal-dot.yellow'));
    assert.ok(css.includes('.terminal-dot.green'));
    assert.ok(css.includes('.status-running'));
    assert.ok(css.includes('.status-done'));
    assert.ok(css.includes('.status-failed'));
    assert.ok(css.includes('.brand-gradient-text'));
  });

  it('has no external references — no @import, no url(), no http(s) links', () => {
    const css = brandBaseCss();
    assert.doesNotMatch(css, /@import/i);
    assert.doesNotMatch(css, /url\(/i);
    assert.doesNotMatch(css, /https?:\/\//i);
  });

  it('is deterministic across calls', () => {
    assert.equal(brandBaseCss(), brandBaseCss());
  });
});
