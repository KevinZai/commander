#!/usr/bin/env node
/**
 * CC Commander Affiliate Link Manager
 *
 * Single source of truth for outbound affiliate URLs. Generates canonical
 * UTM-tracked links and bulk-updates every CCC surface that references a
 * partner.
 *
 * Usage:
 *   node scripts/affiliate-links.mjs status            # show signup status table
 *   node scripts/affiliate-links.mjs get <partner>     # show partner record
 *   node scripts/affiliate-links.mjs url <partner> <campaign> [context]
 *                                                      # generate canonical URL
 *   node scripts/affiliate-links.mjs set <partner> <field> <value>
 *                                                      # update a field (id, ref, status)
 *   node scripts/affiliate-links.mjs render            # dry-run: show all URLs that would land in surfaces
 *   node scripts/affiliate-links.mjs sync              # write canonical URLs into every SKILL.md / doc / html surface
 *   node scripts/affiliate-links.mjs revenue           # report (after signup data is populated)
 *
 * Source of truth: marketing/affiliate-links.json (kept in marketing/, gitignored).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'marketing', 'affiliate-links.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`No affiliate-links.json at ${DATA_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  data.last_updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Generate the canonical affiliate URL for a partner + campaign + context.
 *
 * Hierarchy:
 *   1. If `affiliate_url` is set, use it as-is (already includes ref code).
 *   2. Otherwise, append UTM params + (if ref_code present) partner-specific
 *      ref parameter to base_url.
 *   3. If neither affiliate_url nor ref_code is set, return base_url + UTM
 *      only (clean fallback while application is pending).
 */
function generateUrl(data, partner, campaign, context = 'default') {
  const p = data.partners[partner];
  if (!p) return null;

  // If a fully-formed affiliate_url is set, prefer it
  if (p.affiliate_url) {
    const sep = p.affiliate_url.includes('?') ? '&' : '?';
    return `${p.affiliate_url}${sep}utm_source=ccc&utm_medium=plugin&utm_campaign=${campaign}&utm_content=${partner}-${context}`;
  }

  // Otherwise build from base_url + ref code + UTM
  const url = new URL(p.base_url);
  url.searchParams.set('utm_source', 'ccc');
  url.searchParams.set('utm_medium', 'plugin');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', `${partner}-${context}`);

  // Partner-specific ref param conventions
  if (p.ref_code) {
    const refParam = {
      cloudflare: 'ref',
      supabase: 'via',
      vercel: 'ref',
      sentry: 'utm_source',  // Sentry uses utm_source for attribution
      resend: 'via',
      upstash: 'utm_source',
      fly: 'via',
      neon: 'ref',
      railway: 'referralCode',
      linear: 'via',
      posthog: 'via',
      stripe: 'utm_source',
      lemonsqueezy: 'aff',
    }[partner] || 'ref';
    url.searchParams.set(refParam, p.ref_code);
  }

  return url.toString();
}

function statusTable(data) {
  const rows = Object.entries(data.partners).map(([slug, p]) => {
    const icon =
      p.status === 'live' ? '🟢' :
      p.status === 'approved' ? '🟡' :
      p.status === 'applied' ? '🟠' :
      p.status === 'not_applied' ? '⚪' :
      p.status === 'no_program' ? '🚫' : '❓';
    const linkState = p.ref_code ? `ref=${p.ref_code}` : (p.affiliate_url ? 'custom_url' : '—');
    return {
      partner: p.name.padEnd(15),
      pri: `P${p.priority}`,
      status: `${icon} ${p.status}`.padEnd(20),
      link: linkState.padEnd(20),
      surfaces: p.surfaces.length,
      slug,
    };
  });

  // Sort by priority, then status
  rows.sort((a, b) => a.pri.localeCompare(b.pri));

  console.log('\nPartner          | Pri | Status              | Link state           | Surfaces');
  console.log('-----------------|-----|---------------------|----------------------|----------');
  for (const r of rows) {
    console.log(`${r.partner} | ${r.pri}  | ${r.status} | ${r.link} | ${r.surfaces}`);
  }
  console.log();

  const counts = rows.reduce((acc, r) => {
    const k = r.status.split(' ')[1];
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.log('Summary:', Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' · '));
}

function renderAll(data) {
  console.log('\n=== All URLs that would be injected into CCC surfaces ===\n');
  for (const [slug, p] of Object.entries(data.partners)) {
    if (p.status === 'no_program') continue;
    console.log(`\n📦 ${p.name} (status: ${p.status})`);
    for (const surface of p.surfaces) {
      const campaign = surface.startsWith('/') ? surface.slice(1) : surface;
      const url = generateUrl(data, slug, campaign, 'recommended');
      console.log(`   ${surface.padEnd(25)} → ${url}`);
    }
  }
}

function syncSurfaces(data) {
  console.log('SYNC: This will rewrite affiliate URLs across SKILL.md / docs / html files.');
  console.log('Affected partners:', Object.entries(data.partners).filter(([, p]) => p.affiliate_url || p.ref_code).map(([, p]) => p.name).join(', ') || '(none have IDs yet)');
  console.log();
  console.log('⚠️  No actual writes performed yet — sync is gated until at least one partner has affiliate_id or ref_code.');
  console.log('   Run `node scripts/affiliate-links.mjs set <partner> ref_code <code>` first.');
  // Future: walk surfaces, find base_url, replace with generateUrl()
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
const [, , cmd, ...args] = process.argv;
const data = loadData();

switch (cmd) {
  case 'status':
    statusTable(data);
    break;

  case 'get': {
    const [slug] = args;
    if (!slug || !data.partners[slug]) {
      console.error(`Unknown partner: ${slug}. Known:`, Object.keys(data.partners).join(', '));
      process.exit(1);
    }
    console.log(JSON.stringify(data.partners[slug], null, 2));
    break;
  }

  case 'url': {
    const [slug, campaign, context = 'default'] = args;
    const url = generateUrl(data, slug, campaign, context);
    if (!url) { console.error(`No URL for ${slug}`); process.exit(1); }
    console.log(url);
    break;
  }

  case 'set': {
    const [slug, field, value] = args;
    if (!data.partners[slug]) { console.error(`Unknown partner: ${slug}`); process.exit(1); }
    const allowed = ['ref_code', 'affiliate_id', 'affiliate_url', 'status', 'commission', 'cookie_days', 'network'];
    if (!allowed.includes(field)) { console.error(`Field not editable. Allowed:`, allowed.join(', ')); process.exit(1); }
    data.partners[slug][field] = value === 'null' ? null : value;
    saveData(data);
    console.log(`✓ Set ${slug}.${field} = ${value}`);
    break;
  }

  case 'render':
    renderAll(data);
    break;

  case 'sync':
    syncSurfaces(data);
    break;

  default:
    console.log(`CC Commander Affiliate Link Manager

Commands:
  status                                show signup status table
  get <partner>                         show partner record
  url <partner> <campaign> [context]    generate canonical URL
  set <partner> <field> <value>         update a field
  render                                dry-run URL preview for every surface
  sync                                  rewrite SKILL.md/docs with canonical URLs

Source of truth: marketing/affiliate-links.json
`);
    if (cmd) process.exit(1);
}
