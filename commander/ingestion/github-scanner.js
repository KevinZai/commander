'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INBOX_DIR = path.join(process.env.HOME, '.claude', 'commander', 'inbox');
const PENDING_FILE = path.join(INBOX_DIR, 'pending.json');

const QUERIES = [
  'claude code skills in:readme stars:>5',
  'claude-code-kit OR cc-commander in:name,description',
  'claude code hooks automation stars:>3',
  'CLAUDE.md template starter kit stars:>2',
  'claude code workflow agent orchestration stars:>5',
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

function searchGitHub(query) {
  const escaped = query.replace(/"/g, '\\"');
  const raw = exec(`gh api "search/repositories?q=${encodeURIComponent(escaped)}&sort=stars&per_page=20" 2>/dev/null`);
  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    if (!data.items) return [];
    return data.items.map((item) => ({
      name: item.full_name,
      url: item.html_url,
      description: item.description || '',
      stars: item.stargazers_count,
      language: item.language || 'unknown',
      updatedAt: item.updated_at,
      topics: item.topics || [],
      source: 'github',
      query,
    }));
  } catch {
    return [];
  }
}

function deduplicateResults(results) {
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

function scan() {
  ensureInboxDir();

  let allResults = [];

  for (const query of QUERIES) {
    const results = searchGitHub(query);
    allResults = allResults.concat(results);
  }

  allResults = deduplicateResults(allResults);
  allResults.sort((a, b) => b.stars - a.stars);

  const existing = loadPending();
  const existingUrls = new Set(existing.map((e) => e.url));
  const newItems = allResults.filter((r) => !existingUrls.has(r.url));

  const merged = [...newItems, ...existing];
  const output = {
    lastScan: new Date().toISOString(),
    totalResults: merged.length,
    newResults: newItems.length,
    items: merged,
  };

  fs.writeFileSync(PENDING_FILE, JSON.stringify(output, null, 2));

  return {
    total: merged.length,
    new: newItems.length,
    file: PENDING_FILE,
  };
}

function loadPending() {
  if (!fs.existsSync(PENDING_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    return data.items || [];
  } catch {
    return [];
  }
}

module.exports = { scan, loadPending, QUERIES };
