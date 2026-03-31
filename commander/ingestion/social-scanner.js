'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INBOX_DIR = path.join(process.env.HOME, '.claude', 'commander', 'inbox');
const SOCIAL_FILE = path.join(INBOX_DIR, 'social-pending.json');

const QUERIES = [
  'claude code skills tips',
  'claude code workflow automation',
  'CLAUDE.md best practices',
  'claude code hooks plugins',
];

function ensureInboxDir() {
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 }).trim();
  } catch {
    return '';
  }
}

function extractGitHubUrls(text) {
  const pattern = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/g;
  return [...new Set(text.match(pattern) || [])];
}

function searchX(query) {
  const raw = exec(`x search "${query}" --count 20 2>/dev/null`);
  if (!raw) return [];

  const results = [];
  const lines = raw.split('\n').filter(Boolean);

  for (const line of lines) {
    const githubUrls = extractGitHubUrls(line);
    results.push({
      text: line.slice(0, 280),
      githubUrls,
      query,
      source: 'x',
      scannedAt: new Date().toISOString(),
    });
  }

  return results;
}

function scan() {
  ensureInboxDir();

  let allResults = [];

  for (const query of QUERIES) {
    const results = searchX(query);
    allResults = allResults.concat(results);
  }

  const withGithub = allResults.filter((r) => r.githubUrls.length > 0);

  const allUrls = new Set();
  for (const r of withGithub) {
    for (const url of r.githubUrls) {
      allUrls.add(url);
    }
  }

  const existing = loadSocialPending();
  const existingUrls = new Set(existing.discoveredUrls || []);
  const newUrls = [...allUrls].filter((u) => !existingUrls.has(u));

  const output = {
    lastScan: new Date().toISOString(),
    totalTweets: allResults.length,
    tweetsWithGithub: withGithub.length,
    newUrls: newUrls.length,
    discoveredUrls: [...new Set([...newUrls, ...(existing.discoveredUrls || [])])],
    recentTweets: withGithub.slice(0, 50),
  };

  fs.writeFileSync(SOCIAL_FILE, JSON.stringify(output, null, 2));

  return {
    tweets: allResults.length,
    withGithub: withGithub.length,
    newUrls: newUrls.length,
    file: SOCIAL_FILE,
  };
}

function loadSocialPending() {
  if (!fs.existsSync(SOCIAL_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = { scan, loadSocialPending, QUERIES };
