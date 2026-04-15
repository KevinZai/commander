#!/usr/bin/env node
// ============================================================================
// CC Commander -- Daily Improvement Scanner
// ============================================================================
// Run daily via cron: 0 6 * * * node ~/.claude/hooks/daily-improvement-scan.js
// Scans GitHub and npm for new Claude Code innovations.
// Writes proposals to ~/.claude/improvement-queue/
//
// Environment variables:
//   KZ_IMPROVE_QUEUE_DIR    — Override queue directory (default: ~/.claude/improvement-queue)
//   KZ_IMPROVE_MIN_STARS    — Minimum GitHub stars to include (default: 10)
//   KZ_IMPROVE_SCAN_DAYS    — Days back to search (default: 7)
//   GITHUB_TOKEN            — GitHub PAT for higher API rate limits (optional)
//
// By Kevin Z — CC Commander
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const QUEUE_DIR = process.env.KZ_IMPROVE_QUEUE_DIR
  || path.join(os.homedir(), '.claude', 'improvement-queue');
const SCAN_LOG = path.join(QUEUE_DIR, 'scan-log.json');
const MIN_STARS = parseInt(process.env.KZ_IMPROVE_MIN_STARS, 10) || 10;
const SCAN_DAYS = parseInt(process.env.KZ_IMPROVE_SCAN_DAYS, 10) || 7;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const TRACKED_REPOS = [
  'anthropics/claude-code',
  'anthropics/claude-plugins-official',
  'affaan-m/everything-claude-code',
  'code-yeongyu/oh-my-openagent',
  'thedotmack/claude-mem',
  'NousResearch/hermes-agent',
  'BayramAnnakov/claude-reflect',
  'rtk-ai/rtk',
  'sickn33/antigravity-awesome-skills',
  'jarrodwatts/claude-hud',
];

const SEARCH_QUERIES = [
  'claude-code+skill',
  'claude-code+hook',
  'claude-code+plugin',
  'claude-code+agent',
  'claude-code+config',
];

if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'cc-commander-scanner/1.3',
        'Accept': 'application/vnd.github+json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`JSON parse error from ${url}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.end();
  });
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function categorizeRepo(repo) {
  const name = (repo.name || '').toLowerCase();
  const desc = (repo.description || '').toLowerCase();
  const combined = name + ' ' + desc;

  if (combined.includes('skill')) return 'new-skill';
  if (combined.includes('hook')) return 'new-hook';
  if (combined.includes('command') || combined.includes('slash')) return 'new-command';
  if (combined.includes('security') || combined.includes('vuln')) return 'security-fix';
  if (combined.includes('doc') || combined.includes('guide') || combined.includes('tutorial')) return 'documentation';
  if (combined.includes('integrat') || combined.includes('bridge') || combined.includes('mcp')) return 'integration';
  return 'new-skill';
}

async function scanGitHub() {
  const sinceDate = getDateNDaysAgo(SCAN_DAYS);
  const findings = [];
  const headers = GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {};

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+created:>=${sinceDate}+stars:>=${MIN_STARS}&sort=stars&order=desc&per_page=10`;
      const result = await httpGet(url, headers);

      if (result.items && Array.isArray(result.items)) {
        for (const repo of result.items) {
          const isDuplicate = findings.some((f) => f.url === repo.html_url);
          if (isDuplicate) continue;

          findings.push({
            source: 'github',
            url: repo.html_url,
            description: `${repo.full_name}: ${repo.description || 'No description'}`,
            stars: repo.stargazers_count,
            category: categorizeRepo(repo),
          });
        }
      }
    } catch {
      // API error or rate limit — continue with next query
    }
  }

  for (const repoFullName of TRACKED_REPOS) {
    try {
      const url = `https://api.github.com/repos/${repoFullName}/releases?per_page=3`;
      const releases = await httpGet(url, headers);

      if (Array.isArray(releases)) {
        for (const release of releases) {
          const publishedAt = new Date(release.published_at);
          const cutoffDate = new Date(getDateNDaysAgo(SCAN_DAYS));

          if (publishedAt >= cutoffDate) {
            findings.push({
              source: 'github-release',
              url: release.html_url,
              description: `New release: ${repoFullName} ${release.tag_name} — ${release.name || 'No title'}`,
              stars: 0,
              category: 'skill-upgrade',
            });
          }
        }
      }
    } catch {
      // Repo may not have releases — continue
    }
  }

  return findings;
}

async function scanNpm() {
  const findings = [];

  try {
    const url = 'https://registry.npmjs.org/-/v1/search?text=claude-code&size=20&quality=0.5&popularity=0.5&maintenance=0.3';
    const result = await httpGet(url, {});

    if (result.objects && Array.isArray(result.objects)) {
      const cutoffDate = new Date(getDateNDaysAgo(SCAN_DAYS));

      for (const obj of result.objects) {
        const pkg = obj.package;
        const publishedDate = new Date(pkg.date);

        if (publishedDate >= cutoffDate) {
          const name = (pkg.name || '').toLowerCase();
          const desc = (pkg.description || '').toLowerCase();
          let category = 'new-skill';
          if (name.includes('hook') || desc.includes('hook')) category = 'new-hook';
          if (name.includes('mcp') || desc.includes('mcp')) category = 'integration';
          if (name.includes('security') || desc.includes('security')) category = 'security-fix';

          findings.push({
            source: 'npm',
            url: pkg.links && pkg.links.npm ? pkg.links.npm : `https://www.npmjs.com/package/${pkg.name}`,
            description: `${pkg.name}@${pkg.version}: ${pkg.description || 'No description'}`,
            downloads: 0,
            category,
          });
        }
      }
    }
  } catch {
    // npm API error — continue
  }

  return findings;
}

function loadExistingProposalUrls() {
  const urls = new Set();
  try {
    const files = fs.readdirSync(QUEUE_DIR);
    for (const file of files) {
      if (!file.startsWith('prop-') || !file.endsWith('.json')) continue;
      try {
        const content = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, file), 'utf8'));
        if (content.url) urls.add(content.url);
      } catch {
        // Corrupted file — skip
      }
    }
  } catch {
    // Directory read error — no dedup
  }
  return urls;
}

function createProposal(finding) {
  return {
    id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    source: finding.source,
    url: finding.url,
    description: finding.description,
    category: finding.category,
    impact: 0,
    effort: 0,
    status: 'pending',
    approvals: [],
    rejections: [],
  };
}

async function main() {
  const startTime = Date.now();
  const findings = [];
  const existingUrls = loadExistingProposalUrls();

  try {
    const githubResults = await scanGitHub();
    findings.push(...githubResults);
  } catch (e) {
    process.stderr.write(`[CC Kit] GitHub scan error: ${e.message}\n`);
  }

  try {
    const npmResults = await scanNpm();
    findings.push(...npmResults);
  } catch (e) {
    process.stderr.write(`[CC Kit] npm scan error: ${e.message}\n`);
  }

  const newFindings = findings.filter((f) => !existingUrls.has(f.url));

  let written = 0;
  for (const finding of newFindings) {
    const proposal = createProposal(finding);
    const safeFilename = proposal.id.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) + '.json';
    if (proposal.description) proposal.description = String(proposal.description).slice(0, 2000);
    if (proposal.url) proposal.url = String(proposal.url).slice(0, 2000);
    try {
      fs.writeFileSync(
        path.join(QUEUE_DIR, safeFilename),
        JSON.stringify(proposal, null, 2)
      );
      written++;
    } catch (e) {
      process.stderr.write(`[CC Kit] Failed to write proposal: ${e.message}\n`);
    }
  }

  const log = fs.existsSync(SCAN_LOG)
    ? JSON.parse(fs.readFileSync(SCAN_LOG, 'utf8'))
    : { scans: [] };

  log.scans.push({
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    total_findings: findings.length,
    new_findings: newFindings.length,
    proposals_written: written,
    skipped_duplicates: findings.length - newFindings.length,
  });

  // Keep last 90 days of scan logs
  if (log.scans.length > 90) {
    log.scans = log.scans.slice(-90);
  }

  try {
    fs.writeFileSync(SCAN_LOG, JSON.stringify(log, null, 2));
  } catch {
    // Log write failure — not critical
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[CC Kit] Daily scan complete: ${newFindings.length} new proposals (${findings.length} total findings, ${findings.length - newFindings.length} duplicates skipped) in ${elapsed}s`);
}

main().catch((e) => {
  process.stderr.write(`[CC Kit] Daily scan failed: ${e.message}\n`);
  process.exit(1);
});
