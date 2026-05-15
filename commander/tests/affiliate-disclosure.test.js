/* eslint-disable test-quality/no-unscoped-service-test --
 * This test reads on-disk marketing/docs files for static content checks
 * (affiliate disclosure boilerplate). No service client, no tenant concept.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..', '..');
const DISCLOSURE_PATH = path.join(ROOT, 'mintlify-docs', 'affiliate-disclosure.mdx');
const DOCS_JSON_PATH = path.join(ROOT, 'mintlify-docs', 'docs.json');
const CCC_CONNECT_PATH = path.join(
  ROOT,
  'commander',
  'cowork-plugin',
  'skills',
  'ccc-connect',
  'SKILL.md'
);
const INDEX_HTML_PATH = path.join(ROOT, 'docs', 'index.html');

// Affiliate-eligible services that must be tagged with [aff] in ccc-connect skill
const AFFILIATE_SERVICES = [
  'Supabase',
  'Neon',
  'Vercel',
  'Fly.io',
  'Cloudflare',
  'Upstash',
  'Sentry',
  'Browserbase',
  'Resend',
];

describe('affiliate-disclosure.mdx', () => {
  it('file exists', () => {
    assert.ok(fs.existsSync(DISCLOSURE_PATH), 'affiliate-disclosure.mdx must exist');
  });

  it('has correct frontmatter title', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(content.includes('title:'), 'must have title frontmatter');
    assert.ok(
      content.includes('Affiliate Disclosure') || content.includes('affiliate'),
      'title should reference affiliate disclosure'
    );
  });

  it('has correct frontmatter description', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(content.includes('description:'), 'must have description frontmatter');
  });

  it('has valid MDX frontmatter delimiters', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(content.startsWith('---'), 'must start with --- frontmatter delimiter');
    const endIdx = content.indexOf('---', 3);
    assert.ok(endIdx > 3, 'must have closing --- for frontmatter');
  });

  it('mentions key affiliate programs', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    const services = ['Supabase', 'Vercel', 'Neon', 'Resend', 'Upstash', 'Fly.io'];
    for (const service of services) {
      assert.ok(content.includes(service), `disclosure must mention ${service}`);
    }
  });

  it('mentions "free for now" commitment', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(content.includes('free for now'), 'must state the free-for-now commitment');
  });

  it('mentions contact/questions section', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(
      content.includes('kevinz.ai') || content.includes('github.com') || content.includes('Questions'),
      'must include a contact or questions section'
    );
  });

  it('states "no cost to you" or equivalent', () => {
    const content = fs.readFileSync(DISCLOSURE_PATH, 'utf8');
    assert.ok(
      content.includes('no cost to you') || content.includes('same price'),
      'must clarify that affiliate links cost the user nothing extra'
    );
  });
});

describe('docs.json — navigation includes affiliate-disclosure', () => {
  it('docs.json exists', () => {
    assert.ok(fs.existsSync(DOCS_JSON_PATH), 'docs.json must exist');
  });

  it('affiliate-disclosure is in the navigation', () => {
    const docsJson = JSON.parse(fs.readFileSync(DOCS_JSON_PATH, 'utf8'));
    const allPages = [];

    function collectPages(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(collectPages);
      } else if (obj && typeof obj === 'object') {
        if (obj.pages && Array.isArray(obj.pages)) {
          allPages.push(...obj.pages);
        }
        Object.values(obj).forEach(collectPages);
      }
    }

    collectPages(docsJson);
    assert.ok(
      allPages.includes('affiliate-disclosure'),
      'affiliate-disclosure must be in docs.json navigation pages'
    );
  });

  it('affiliate-disclosure is in a Legal or About group', () => {
    const docsJson = JSON.parse(fs.readFileSync(DOCS_JSON_PATH, 'utf8'));
    const groups = [];

    function collectGroups(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(collectGroups);
      } else if (obj && typeof obj === 'object') {
        if (obj.group && obj.pages) {
          groups.push(obj);
        }
        Object.values(obj).forEach(collectGroups);
      }
    }

    collectGroups(docsJson);
    const legalGroup = groups.find(
      g =>
        (g.group === 'Legal' || g.group === 'About') &&
        g.pages.includes('affiliate-disclosure')
    );
    assert.ok(legalGroup, 'affiliate-disclosure should be in a Legal or About group in docs.json');
  });
});

describe('ccc-connect skill — affiliate disclosure', () => {
  it('skill file exists', () => {
    assert.ok(fs.existsSync(CCC_CONNECT_PATH), 'ccc-connect SKILL.md must exist');
  });

  it('includes affiliate disclosure banner', () => {
    const content = fs.readFileSync(CCC_CONNECT_PATH, 'utf8');
    assert.ok(
      content.includes('affiliate') || content.includes('[aff]'),
      'ccc-connect skill must include affiliate disclosure reference'
    );
    assert.ok(
      content.includes('affiliate-disclosure') || content.includes('Disclosure'),
      'ccc-connect skill must link to the disclosure page'
    );
  });

  it('disclosure banner appears near the top of the skill (before category picker)', () => {
    const content = fs.readFileSync(CCC_CONNECT_PATH, 'utf8');
    const disclosureIdx = content.indexOf('affiliate');
    const pickerIdx = content.indexOf('Category picker') || content.indexOf('category picker') || content.indexOf('AskUserQuestion');
    assert.ok(disclosureIdx < pickerIdx, 'affiliate disclosure must appear before the category picker');
  });

  it('tags all affiliate-eligible services with [aff]', () => {
    const content = fs.readFileSync(CCC_CONNECT_PATH, 'utf8');
    const missing = [];

    for (const service of AFFILIATE_SERVICES) {
      // Check that wherever this service appears in a picker option, it has [aff]
      // We look for the service name followed by [aff] within 20 chars
      const re = new RegExp(`${service.replace('.', '\\.')}.*?\\[aff\\]`);
      if (!re.test(content)) {
        missing.push(service);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `These affiliate services are missing [aff] tag in ccc-connect: ${missing.join(', ')}`
    );
  });
});

describe('docs/index.html — footer link', () => {
  it('index.html exists', () => {
    assert.ok(fs.existsSync(INDEX_HTML_PATH), 'docs/index.html must exist');
  });

  it('includes affiliate disclosure link in footer', () => {
    const content = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    assert.ok(
      content.includes('affiliate-disclosure'),
      'index.html footer must include a link to affiliate-disclosure'
    );
    assert.ok(
      content.includes('Affiliate Disclosure') || content.includes('affiliate'),
      'index.html should have visible affiliate disclosure text'
    );
  });
});
