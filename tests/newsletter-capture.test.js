'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { renderSnippet, validAction } = require('../scripts/build-newsletter-snippet.js');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SURFACES = [
  'site/components/newsletter-signup.tsx',
  'scripts/build-newsletter-snippet.js',
  'site/lib/newsletter.config.json',
  'mintlify-docs/snippets/newsletter-signup.mdx',
  'mintlify-docs/bible.mdx',
];
const PROVIDERS = /buttondown|convertkit|kit\.com|substack|mailchimp|mailerlite|beehiiv|formspree|list-manage/i;

test('shipped config leaves the form unconfigured', () => {
  const cfg = JSON.parse(read('site/lib/newsletter.config.json'));
  assert.strictEqual(cfg.formAction, '');
});

test('snippet renders no form when unconfigured or invalid', () => {
  for (const v of ['', '  ', undefined, null, 'http://insecure.example', 'javascript:alert(1)', 'https://x"onload=1']) {
    const out = renderSnippet({ formAction: v });
    assert.ok(!/<form|<input|action=/.test(out), String(v));
  }
  assert.ok(!/<form/.test(renderSnippet(undefined)));
});

test('snippet is driven by the single config value', () => {
  assert.ok(validAction('https://forms.example.test/subscribe'));
  const out = renderSnippet({ formAction: 'https://forms.example.test/subscribe' });
  assert.match(out, /<form action="https:\/\/forms\.example\.test\/subscribe"/);
  assert.match(out, /privacy/);
  assert.ok(!/<script/.test(out));
});

test('committed snippet matches generator output', () => {
  const cfg = JSON.parse(read('site/lib/newsletter.config.json'));
  assert.strictEqual(read('mintlify-docs/snippets/newsletter-signup.mdx'), renderSnippet(cfg));
});

test('no surface hard-codes a provider endpoint or loads third-party scripts', () => {
  for (const f of SURFACES) {
    const src = read(f);
    assert.ok(!PROVIDERS.test(src.replace(/Buttondown, ConvertKit\/Kit or Substack/, '')), f);
    assert.ok(!/<script/i.test(src), f);
  }
  const tsx = read('site/components/newsletter-signup.tsx');
  assert.ok(!/action=\{?"https?:/.test(tsx));
  assert.match(tsx, /newsletter\.config\.json/);
  assert.match(tsx, /if \(!enabled\) return null/);
  assert.match(tsx, /\/privacy/);
});

test('landing page mounts the component and the Bible stays ungated', () => {
  assert.match(read('site/app/page.tsx'), /<NewsletterSignup \/>/);
  const bible = read('mintlify-docs/bible.mdx');
  assert.match(bible, /No gate, ever/);
  assert.match(bible, /<NewsletterSignup \/>/);
});
