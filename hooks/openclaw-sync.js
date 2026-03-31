#!/usr/bin/env node
// ============================================================================
// CC Commander — OpenClaw Sync (SessionStart)
// ============================================================================
// Auto-detects OpenClaw gateway and syncs Kit skills to the registry.
// Exits immediately if OpenClaw is not found or not enabled.
//
// Environment variables:
//   CC_OPENCLAW_ENABLED=1     Enable OpenClaw sync (or KZ_OPENCLAW_ENABLED=1)
//   CC_OPENCLAW_URL=...       Gateway URL (default: http://localhost:18789)
//   CC_OPENCLAW_TIMEOUT=5000  Request timeout in ms
//
// This hook runs on SessionStart — it fires once when Claude Code starts.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// ---------------------------------------------------------------------------
// Passthrough stdin → stdout
// ---------------------------------------------------------------------------
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(input);

  // Gate: check if OpenClaw sync is enabled
  const enabled =
    process.env.CC_OPENCLAW_ENABLED === '1' ||
    process.env.KZ_OPENCLAW_ENABLED === '1';
  if (!enabled) return;

  run().catch(() => {
    // Silent failure
  });
});

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------
async function run() {
  const gatewayUrl = process.env.CC_OPENCLAW_URL
    || process.env.KZ_OPENCLAW_URL
    || 'http://localhost:18789';
  const timeout = parseInt(
    process.env.CC_OPENCLAW_TIMEOUT || process.env.KZ_OPENCLAW_TIMEOUT || '5000',
    10
  );

  // Step 1: Check if OpenClaw gateway is running
  const healthy = await checkHealth(gatewayUrl, timeout);
  if (!healthy) {
    // Gateway not running — exit silently
    return;
  }

  const t = getColors();

  // Step 2: Discover Kit skills
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');
  const skills = discoverSkills(skillsDir);

  // Step 3: Register skills with OpenClaw
  try {
    await registerSkills(gatewayUrl, skills, timeout);
    process.stderr.write(
      `${t.dim}━━${t.reset} ${t.accent}OPENCLAW${t.reset} ` +
      `${t.secondary}Synced ${skills.length} Kit skills with gateway${t.reset}\n`
    );
  } catch {
    process.stderr.write(
      `${t.dim}━━${t.reset} ${t.warn}OPENCLAW${t.reset} ` +
      `${t.secondary}Skill sync failed (gateway may not support registry)${t.reset}\n`
    );
  }

  // Step 4: Report session start event
  try {
    await sendEvent(gatewayUrl, {
      type: 'cc_kit_session_start',
      source: 'cc-commander',
      version: '1.3',
      skills_count: skills.length,
      timestamp: new Date().toISOString(),
    }, timeout);
  } catch {
    // Silent — event forwarding is optional
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkHealth(baseUrl, timeout) {
  return new Promise((resolve) => {
    const url = new URL('/health', baseUrl);
    const req = http.get(url.href, { timeout }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function discoverSkills(dir) {
  const skills = [];
  try {
    if (!fs.existsSync(dir)) return skills;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf8');
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        skills.push({
          id: entry.name,
          name: nameMatch ? nameMatch[1].trim() : entry.name,
          description: descMatch ? descMatch[1].trim() : '',
          source: 'cc-commander',
        });
      }
    }
  } catch {
    // Silent
  }
  return skills;
}

function registerSkills(baseUrl, skills, timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/webhooks/cc-commander', baseUrl);
    const body = JSON.stringify({ type: 'skill_sync', skills });
    const req = http.request(url.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Kit-Source': 'cc-commander',
        'X-CC-Kit-Version': '1.3',
      },
      timeout,
    }, (res) => {
      res.resume();
      res.statusCode < 400 ? resolve() : reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function sendEvent(baseUrl, event, timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/webhooks/cc-commander', baseUrl);
    const body = JSON.stringify(event);
    const req = http.request(url.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Kit-Source': 'cc-commander',
        'X-CC-Kit-Version': '1.3',
      },
      timeout,
    }, (res) => {
      res.resume();
      resolve();
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function getColors() {
  try {
    const { getSafeTheme } = require(path.join(__dirname, '..', 'lib', 'themes.js'));
    return getSafeTheme();
  } catch {
    return {
      primary: '\x1b[38;5;172m', secondary: '\x1b[38;5;145m',
      dim: '\x1b[38;5;240m', accent: '\x1b[38;5;99m',
      warn: '\x1b[38;5;214m', reset: '\x1b[0m',
    };
  }
}
