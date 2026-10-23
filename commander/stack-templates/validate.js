'use strict';

// Offline validator for Bring Your Stack templates (CC-756 slice 1).
// Pure functions, no network, no signups. Affiliate URL resolution is a later slice.

const fs = require('node:fs');
const path = require('node:path');

const TEMPLATES_PATH = path.join(__dirname, 'templates.json');
const SCHEMA_VERSION = 1;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROLES = ['frontend', 'backend', 'database', 'hosting', 'cache', 'email', 'observability', 'payments', 'other'];

// Connector ids that /ccc-connect knows (commander/cowork-plugin/CONNECTORS.md).
const KNOWN_CONNECTORS = [
  'github', 'notion', 'linear', 'supabase', 'neon', 'postgres', 'vercel', 'flyio', 'cloudflare',
  'upstash', 'sentry', 'stripe', 'browserbase', 'resend', 'agentmail', 'figma', 'slack', 'discord',
  'tavily', 'firecrawl', 'exa', 'context7', 'playwright', 'zapier', 'n8n',
];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateTemplate(t, index) {
  const errors = [];
  const where = 'templates[' + index + ']' + (t && t.id ? ' (' + t.id + ')' : '');
  if (!t || typeof t !== 'object' || Array.isArray(t)) return [where + ': must be an object'];
  if (!isNonEmptyString(t.id) || !ID_RE.test(t.id)) errors.push(where + ': id must be kebab-case');
  if (!isNonEmptyString(t.label)) errors.push(where + ': label required');
  if (!Array.isArray(t.services) || t.services.length === 0) {
    errors.push(where + ': services must be a non-empty array');
    return errors;
  }
  const seen = new Set();
  t.services.forEach(function(s, i) {
    const sw = where + '.services[' + i + ']';
    if (!s || typeof s !== 'object') { errors.push(sw + ': must be an object'); return; }
    if (!ROLES.includes(s.role)) errors.push(sw + ': role must be one of ' + ROLES.join(', '));
    if (!isNonEmptyString(s.name)) errors.push(sw + ': name required');
    if (s.connector !== null && s.connector !== undefined) {
      if (!KNOWN_CONNECTORS.includes(s.connector)) errors.push(sw + ': unknown connector ' + s.connector);
      else if (seen.has(s.connector)) errors.push(sw + ': duplicate connector ' + s.connector);
      seen.add(s.connector);
    }
    // Slice 1 is offline: templates carry no URLs; link resolution happens at connect time.
    if ('url' in s || 'signupUrl' in s || 'affiliateUrl' in s) errors.push(sw + ': URLs are not allowed in templates');
  });
  return errors;
}

function validateTemplates(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return ['document must be an object'];
  if (doc.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion must be ' + SCHEMA_VERSION);
  if (!Array.isArray(doc.templates) || doc.templates.length === 0) {
    errors.push('templates must be a non-empty array');
    return errors;
  }
  const ids = new Set();
  doc.templates.forEach(function(t, i) {
    errors.push.apply(errors, validateTemplate(t, i));
    if (t && t.id) {
      if (ids.has(t.id)) errors.push('duplicate template id ' + t.id);
      ids.add(t.id);
    }
  });
  return errors;
}

function loadTemplates() {
  return JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
}

module.exports = { validateTemplate, validateTemplates, loadTemplates, ROLES, KNOWN_CONNECTORS, SCHEMA_VERSION, TEMPLATES_PATH };
