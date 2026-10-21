#!/usr/bin/env node
'use strict';
// Renders the Mintlify newsletter snippet from site/lib/newsletter.config.json,
// the single config value shared with the landing-page component.
//   --apply  write mintlify-docs/snippets/newsletter-signup.mdx
//   --check  exit 1 when the snippet is out of sync (default)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'site', 'lib', 'newsletter.config.json');
const OUT = path.join(ROOT, 'mintlify-docs', 'snippets', 'newsletter-signup.mdx');
const PRIVACY = 'https://commanderplugin.com/privacy';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function validAction(v) {
  return typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v.trim());
}

// Pure: config object -> MDX string. Unset or invalid action renders no form.
function renderSnippet(config) {
  const action = config && validAction(config.formAction) ? config.formAction.trim() : '';
  if (!action) {
    return '{/* Newsletter capture is disabled: set formAction in site/lib/newsletter.config.json. */}\n';
  }
  return `<form action="${esc(action)}" method="post" target="_blank" rel="noopener">
  <p><strong>Occasional release notes and field-manual updates.</strong> Optional. The Bible stays free and needs no sign-up.</p>
  <label htmlFor="ccc-newsletter-email">Email address</label>
  <input id="ccc-newsletter-email" type="email" name="email" required autoComplete="email" />
  <button type="submit">Subscribe</button>
  <p><small>By subscribing you agree to receive occasional emails from CC Commander. Unsubscribe any time. See the <a href="${PRIVACY}">privacy policy</a>.</small></p>
</form>
`;
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const want = renderSnippet(config);
  if (process.argv.includes('--apply')) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, want);
    console.log('wrote ' + path.relative(ROOT, OUT));
    return;
  }
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (have !== want) {
    console.error('newsletter snippet out of sync; run: node scripts/build-newsletter-snippet.js --apply');
    process.exit(1);
  }
  console.log('newsletter snippet in sync');
}

if (require.main === module) main();
module.exports = { renderSnippet, validAction };
