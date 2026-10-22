'use strict';
/* eslint-disable test-quality/no-unscoped-service-test --
 * Reads static stack-template JSON only; "supabase" is a partner name in the
 * link data, not a mocked service client, so there is no tenant to scope.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const LIB = path.join(__dirname, '..', 'cowork-plugin', 'lib');
const DATA_FILE = path.join(LIB, 'stack-templates.json');
const DISCLOSURE_DOC = path.join(__dirname, '..', '..', 'mintlify-docs', 'affiliate-disclosure.mdx');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

let mod;
const load = async () => (mod ||= await import(path.join(LIB, 'stack-links.mjs')));

describe('stack-templates.json', () => {
  it('has about ten stacks and validates clean', async () => {
    const { validateData } = await load();
    assert.ok(data.stacks.length >= 10);
    assert.deepEqual(validateData(data), []);
  });

  it('every picker group holds at most four stacks (AskUserQuestion limit)', () => {
    for (const g of Object.keys(data.groups)) {
      const n = data.stacks.filter((s) => s.group === g).length;
      assert.ok(n >= 1 && n <= 4, `${g} has ${n}`);
    }
    assert.ok(Object.keys(data.groups).length <= 3, 'groups plus Skip fit four options');
  });

  it('all signup URLs are https with no credentials, query or fragment in the template', () => {
    for (const [id, p] of Object.entries(data.partners)) {
      const u = new URL(p.signupUrl);
      assert.equal(u.protocol, 'https:', id);
      assert.equal(u.username + u.password, '', id);
      assert.equal(u.search + u.hash, '', id);
    }
  });

  it('affiliate partners are exactly those disclosed in affiliate-disclosure.mdx', () => {
    const doc = fs.readFileSync(DISCLOSURE_DOC, 'utf8');
    for (const [id, p] of Object.entries(data.partners)) {
      const host = new URL(p.signupUrl).hostname.replace(/^www\./, '');
      assert.equal(doc.includes(`(https://${host})`), p.affiliate, `${id} disclosure mismatch`);
    }
  });

  it('contains no secrets and no invented ref codes', () => {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    assert.ok(!/(sk|pk|rk)_(live|test)_|AKIA[0-9A-Z]{16}|ghp_|xox[bp]-|-----BEGIN/.test(raw));
    assert.ok(!/[A-Za-z0-9+/_-]{32,}/.test(raw.replace(/https?:\/\/\S+/g, '')), 'no long token-like strings');
    for (const p of Object.values(data.partners)) assert.equal(p.refCode ?? null, null, 'no ref code until a real one is issued');
  });

  it('carries the disclosure wording and link', () => {
    assert.match(data.disclosure, /affiliate/i);
    assert.match(data.disclosure, /commission/i);
    assert.match(data.disclosure, /no cost to you/i);
    assert.equal(new URL(data.disclosureUrl).protocol, 'https:');
    assert.ok(data.disclosure.includes(data.disclosureUrl));
  });
});

describe('resolveStack', () => {
  it('resolves every template to https links, with disclosure when any is affiliate', async () => {
    const { resolveStack, renderMarkdown } = await load();
    for (const s of data.stacks) {
      const r = resolveStack(s.id);
      assert.equal(r.links.length, s.services.length);
      for (const l of r.links) {
        const u = new URL(l.url);
        assert.equal(u.protocol, 'https:', l.url);
        assert.equal(u.username + u.password, '');
        assert.equal(u.searchParams.has('utm_source'), l.affiliate);
      }
      assert.equal(r.hasAffiliate, r.links.some((l) => l.affiliate));
      const md = renderMarkdown(r);
      assert.equal(/Disclosure:/.test(md), r.hasAffiliate, s.id);
      assert.equal(md.includes('[aff]'), r.hasAffiliate, s.id);
    }
  });

  it('non-affiliate stacks get plain links with no tracking', async () => {
    const { resolveStack } = await load();
    const r = resolveStack('self-hosted-postgres');
    assert.equal(r.hasAffiliate, false);
    for (const l of r.links) assert.equal(new URL(l.url).search, '');
  });

  it('adds ref code from the data file only, and escapes values', async () => {
    const { resolveStack } = await load();
    const d = structuredClone(data);
    d.partners.supabase.refCode = 'abc-123';
    const r = resolveStack('nextjs-supabase-vercel', { data: d });
    const u = new URL(r.links.find((l) => l.partner === 'supabase').url);
    assert.equal(u.searchParams.get('via'), 'abc-123');
    assert.equal(u.searchParams.get('utm_content'), 'supabase-nextjs-supabase-vercel');
    d.partners.supabase.refCode = 'a&b=c#x';
    assert.throws(() => resolveStack('nextjs-supabase-vercel', { data: d }), /unsupported/);
  });

  it('rejects non-https templates', async () => {
    const { buildUrl } = await load();
    assert.throws(() => buildUrl('x', { signupUrl: 'http://example.com', affiliate: false }, 's'), /https/);
  });

  it('rejects bad or unknown stack ids and services outside the stack', async () => {
    const { resolveStack } = await load();
    assert.throws(() => resolveStack('../etc/passwd'), /invalid/);
    assert.throws(() => resolveStack(undefined), /invalid/);
    assert.throws(() => resolveStack('nope'), /unknown stack/);
    assert.throws(() => resolveStack('nextjs-supabase-vercel', { only: ['neon'] }), /not in stack/);
  });

  it('supports a user-picked subset', async () => {
    const { resolveStack } = await load();
    const r = resolveStack('nextjs-neon-vercel', { only: ['vercel'] });
    assert.deepEqual(r.links.map((l) => l.partner), ['vercel']);
  });
});

describe('ccc-start wiring', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'cowork-plugin', 'skills', 'ccc-start', 'SKILL.md'), 'utf8');
  it('offers the stack step as skippable, opt-in and disclosed', () => {
    assert.match(skill, /what stack are you on/i);
    assert.match(skill, /Skip for now/);
    assert.match(skill, /stack-links\.mjs/);
    assert.match(skill, /affiliate/i);
    assert.match(skill, /affiliate-disclosure/);
  });
});
