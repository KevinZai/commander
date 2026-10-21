/**
 * stack-links.mjs
 * Resolves a "Bring Your Stack" template (CC-756) to signup links.
 *
 * Pure and offline: reads only stack-templates.json beside this file, makes
 * no network calls, writes nothing. Referral codes come from that one data
 * file (null until a real code exists) and are never invented. UTM tags are
 * added only to affiliate partners' links, and only when the user has chosen
 * to see links; nothing is signed up or connected here.
 *
 * CLI: node stack-links.mjs list | node stack-links.mjs <stack-id> [partner,...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(HERE, 'stack-templates.json');
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const REF_VALUE = /^[A-Za-z0-9._-]{1,64}$/;

export function loadStackData(file = DATA_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function listStacks(data = loadStackData()) {
  return data.stacks.map(({ id, group, label, summary }) => ({ id, group, label, summary }));
}

/** Build one signup URL. Uses URL/searchParams so every value is escaped. */
export function buildUrl(partnerId, partner, stackId) {
  const url = new URL(partner.signupUrl);
  if (url.protocol !== 'https:') throw new Error(`${partnerId}: signup URL must be https`);
  if (!partner.affiliate) return url.toString();
  url.searchParams.set('utm_source', 'ccc');
  url.searchParams.set('utm_medium', 'plugin');
  url.searchParams.set('utm_campaign', 'ccc-start');
  url.searchParams.set('utm_content', `${partnerId}-${stackId}`);
  if (partner.refCode != null) {
    if (!REF_VALUE.test(partner.refCode)) throw new Error(`${partnerId}: refCode has unsupported characters`);
    // A refParam of utm_source is the vendor's own convention and replaces ours.
    url.searchParams.set(partner.refParam, partner.refCode);
  }
  return url.toString();
}

/**
 * @param {string} stackId
 * @param {{ only?: string[], data?: object }} [opts] only: restrict to a subset of the stack's services
 */
export function resolveStack(stackId, { only, data = loadStackData() } = {}) {
  if (typeof stackId !== 'string' || !SLUG.test(stackId)) throw new Error('invalid stack id');
  const stack = data.stacks.find((s) => s.id === stackId);
  if (!stack) throw new Error(`unknown stack: ${stackId}`);
  let ids = stack.services;
  if (only) {
    const bad = only.filter((p) => !stack.services.includes(p));
    if (bad.length) throw new Error(`not in stack ${stackId}: ${bad.join(', ')}`);
    ids = stack.services.filter((p) => only.includes(p));
  }
  const links = ids.map((id) => {
    const p = data.partners[id];
    return { partner: id, name: p.name, role: p.role, affiliate: p.affiliate, url: buildUrl(id, p, stackId) };
  });
  return {
    stack: { id: stack.id, label: stack.label, summary: stack.summary },
    links,
    hasAffiliate: links.some((l) => l.affiliate),
    disclosure: data.disclosure,
  };
}

/** Markdown for the skill to show. Affiliate links are marked [aff] and the disclosure leads. */
export function renderMarkdown(resolved) {
  const lines = [];
  if (resolved.hasAffiliate) lines.push(`Disclosure: ${resolved.disclosure}`, '');
  lines.push(`**${resolved.stack.label}** - ${resolved.stack.summary}`, '');
  for (const l of resolved.links) {
    lines.push(`- ${l.name}${l.affiliate ? ' [aff]' : ''} - ${l.role}: ${l.url}`);
  }
  return lines.join('\n');
}

/** Returns a list of problems; empty means the data file is valid. */
export function validateData(data) {
  const errs = [];
  const ids = new Set();
  for (const [id, p] of Object.entries(data.partners || {})) {
    if (!SLUG.test(id)) errs.push(`partner id ${id}`);
    try {
      if (new URL(p.signupUrl).protocol !== 'https:') errs.push(`${id}: not https`);
    } catch {
      errs.push(`${id}: bad URL`);
    }
    if (p.affiliate && !p.refParam) errs.push(`${id}: affiliate partner needs refParam`);
    if (!p.affiliate && p.refCode != null) errs.push(`${id}: non-affiliate partner has refCode`);
  }
  for (const s of data.stacks || []) {
    if (!SLUG.test(s.id) || ids.has(s.id)) errs.push(`stack id ${s.id}`);
    ids.add(s.id);
    if (!data.groups?.[s.group]) errs.push(`${s.id}: unknown group`);
    if (!s.services?.length) errs.push(`${s.id}: no services`);
    for (const p of s.services || []) if (!data.partners[p]) errs.push(`${s.id}: unknown partner ${p}`);
  }
  return errs;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [cmd, subset] = process.argv.slice(2);
  try {
    if (cmd === 'list') {
      for (const s of listStacks()) console.log(`${s.id}\t${s.group}\t${s.label}`);
    } else if (cmd) {
      console.log(renderMarkdown(resolveStack(cmd, { only: subset ? subset.split(',') : undefined })));
    } else {
      console.error('usage: stack-links.mjs list | <stack-id> [partner,...]');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
