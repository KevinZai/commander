#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readTopSkills } from '../commander/cowork-plugin/lib/top-skills.js';
import { brandBaseCss } from '../commander/cowork-plugin/lib/brand-css.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = path.join(ROOT, 'commander/cowork-plugin/lib/cockpit-template.html');
const CONTRACT_PATH = path.join(ROOT, 'commander/contract.json');
const PLUGIN_SKILLS_DIR = path.join(ROOT, 'commander/cowork-plugin/skills');
const ECOSYSTEM_SKILLS_DIR = path.join(ROOT, 'skills');
const AGENTS_DIR = path.join(ROOT, 'commander/cowork-plugin/agents');
const TIERS_PATH = path.join(ECOSYSTEM_SKILLS_DIR, '_tiers.json');
const DATA_MARKER = '/*__COCKPIT_DATA__*/';
const BRAND_MARKER = '/*__BRAND_CSS__*/';
const SKIPPED_DIRS = new Set(['node_modules', '.git', 'vendor']);

const DEFAULT_PERSONA = Object.freeze({ emoji: '🤖', role: 'Agent' });
const PERSONA_MAP = Object.freeze({
  architect: { emoji: '🏗️', role: 'Architect' },
  reviewer: { emoji: '🔍', role: 'Reviewer' },
  builder: { emoji: '🔨', role: 'Builder' },
  'security-auditor': { emoji: '🔐', role: 'Security Auditor' },
  debugger: { emoji: '🐛', role: 'Debugger' },
  designer: { emoji: '🎨', role: 'Designer' },
  'qa-engineer': { emoji: '🧪', role: 'QA Engineer' },
  'devops-engineer': { emoji: '🚀', role: 'DevOps Engineer' },
  'data-analyst': { emoji: '📊', role: 'Data Analyst' },
  'content-strategist': { emoji: '✍️', role: 'Content Strategist' },
  'product-manager': { emoji: '🎯', role: 'Product Manager' },
  'performance-engineer': { emoji: '⚡', role: 'Performance Engineer' },
  researcher: { emoji: '🔬', role: 'Researcher' },
  'technical-writer': { emoji: '📝', role: 'Technical Writer' },
  'fleet-worker': { emoji: '⚙️', role: 'Fleet Worker' },
  'typescript-reviewer': { emoji: '🔍', role: 'TypeScript Reviewer' },
  'python-reviewer': { emoji: '🔍', role: 'Python Reviewer' },
  'go-reviewer': { emoji: '🔍', role: 'Go Reviewer' },
  'rust-reviewer': { emoji: '🔍', role: 'Rust Reviewer' },
  'java-reviewer': { emoji: '🔍', role: 'Java Reviewer' },
  'kotlin-reviewer': { emoji: '🔍', role: 'Kotlin Reviewer' },
  'csharp-reviewer': { emoji: '🔍', role: 'C# Reviewer' },
});

const JOBS = Object.freeze([
  { label: '🌐 Build a website', query: 'build web design' },
  { label: '🐛 Fix a bug', query: 'debug' },
  { label: '🚀 Ship / deploy', query: 'deploy ship' },
  { label: '🔍 Review my code', query: 'review' },
  { label: '📈 Grow traffic', query: 'seo marketing' },
  { label: '🔐 Security check', query: 'security audit' },
  { label: '🧪 Add tests', query: 'test coverage' },
  { label: '📊 Understand data', query: 'data sql' },
  { label: '✍️ Write content', query: 'content copywriting' },
  { label: '🤖 Automate a workflow', query: 'loop schedule automation' },
]);

const PATTERNS = Object.freeze([
  {
    key: 'outcome',
    name: 'Describe the outcome',
    hint: 'Say what the finished result should look like, not the steps to take.',
    test: '(so that|end state|done (looks|means)|goal:|outcome)',
  },
  {
    key: 'selfcheck',
    name: 'Give it a self-check',
    hint: 'Ask it to run, test, compare, or verify its work before stopping.',
    test: '(verify|prove|show (me )?(proof|output)|run (the )?tests|check your)',
  },
  {
    key: 'reference',
    name: 'Point at a reference',
    hint: 'Name an existing file, test, example, or pattern for it to match.',
    test: '(like|match|same as|following|pattern in|@|\\.md|\\.ts|\\.js)',
  },
  {
    key: 'target',
    name: 'State a measurable target',
    hint: 'Give a metric and threshold that make done unambiguous.',
    test: '([0-9]+\\s*(%|ms|s\\b|x\\b)|all tests|zero |under |at least)',
  },
  {
    key: 'artifact',
    name: 'Give it the artifact',
    hint: 'Provide the exact file, error, log, screenshot, or deliverable it needs.',
    test: '(PR|pull request|file|report|diff|artifact|document|table)',
  },
  {
    key: 'format',
    name: 'Say how you want the answer',
    hint: 'Specify the answer format, length, structure, or audience.',
    test: '(format|table|bullet|json|markdown|structure|sections)',
  },
]);

function parseArgs(argv) {
  let outPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== '--out') throw new Error(`Unknown argument: ${arg}`);
    if (outPath !== null) throw new Error('--out may only be specified once');
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error('--out requires a path');
    outPath = path.resolve(process.cwd(), value);
    index += 1;
  }
  return { outPath };
}

function walkFilesNamed(rootDir, filename) {
  const matches = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === filename) {
        matches.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return matches.sort((left, right) => left.localeCompare(right));
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return {};
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return {};
  const lines = normalized.slice(4, end).split('\n');
  const values = {};

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(lines[index]);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (rawValue !== '|' && rawValue !== '>') {
      values[key] = parseScalar(rawValue);
      continue;
    }

    const block = [];
    while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
      index += 1;
      block.push(lines[index].trim());
    }
    values[key] = block.filter(Boolean).join(rawValue === '>' ? ' ' : '\n');
  }

  return values;
}

function firstHeading(markdown) {
  const match = /^#{1,6}\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : '';
}

function readSkill(filePath, fallbackId) {
  const markdown = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(markdown);
  const name = String(frontmatter.name || fallbackId).trim();
  const desc = String(frontmatter.description || firstHeading(markdown) || name).trim();
  return { name, desc };
}

function buildTierMap() {
  const config = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf8'));
  const tierById = new Map();
  for (const [tier, definition] of Object.entries(config.tiers || {})) {
    for (const id of definition.skills || []) {
      if (!tierById.has(id)) tierById.set(id, tier);
    }
  }
  return tierById;
}

function buildPluginSkills(files) {
  return files.map((filePath) => {
    const fallbackId = path.basename(path.dirname(filePath));
    const { name, desc } = readSkill(filePath, fallbackId);
    return {
      id: name,
      name,
      cmd: `/${name}`,
      desc,
      domain: name.startsWith('ccc-') ? name : '',
      tier: '',
      source: 'plugin',
    };
  });
}

function buildEcosystemSkills(files, tierById) {
  return files.map((filePath) => {
    const relativePath = path.relative(ECOSYSTEM_SKILLS_DIR, filePath);
    const directories = relativePath.split(path.sep).slice(0, -1);
    const id = directories.at(-1);
    const { name, desc } = readSkill(filePath, id);
    const domain = directories.slice(0, -1).find((part) => part.startsWith('ccc-')) || '';
    return {
      id,
      name,
      cmd: id,
      desc,
      domain,
      tier: tierById.get(id) || '',
      source: 'ecosystem',
    };
  });
}

function mergeSkills(pluginSkills, ecosystemSkills) {
  const pluginIds = new Set(pluginSkills.map((skill) => skill.id));
  return [...pluginSkills, ...ecosystemSkills.filter((skill) => !pluginIds.has(skill.id))];
}

function buildAgents() {
  return fs
    .readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const id = entry.name.slice(0, -3);
      const markdown = fs.readFileSync(path.join(AGENTS_DIR, entry.name), 'utf8');
      const frontmatter = parseFrontmatter(markdown);
      const persona = PERSONA_MAP[id] || DEFAULT_PERSONA;
      return {
        id,
        name: String(frontmatter.name || id).trim(),
        emoji: persona.emoji,
        role: persona.role,
        desc: String(frontmatter.description || firstHeading(markdown) || id).trim().slice(0, 200),
        model: String(frontmatter.model || '').trim(),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function findCatalogSkill(skills, candidates) {
  for (const id of candidates) {
    const match = skills.find((skill) => skill.id === id);
    if (match) return match;
  }
  throw new Error(`Idea references missing catalog skill: ${candidates.join(' or ')}`);
}

function buildIdeas(skills) {
  const projects = [
    {
      name: 'Website/Landing page',
      moves: [
        { subject: 'the page experience', benefit: 'shaping a clear, polished interface', skills: ['ccc-design', 'frontend-design'] },
        { subject: 'the conversion journey', benefit: 'turning more visits into action', skills: ['landing-page-builder', 'landing-page-generator'] },
      ],
    },
    {
      name: 'SaaS app',
      moves: [
        { subject: 'the SaaS foundation', benefit: 'covering the product patterns that SaaS teams need', skills: ['ccc-saas', 'saas-scaffolder'] },
        { subject: 'the signup flow', benefit: 'removing friction before activation', skills: ['signup-flow-cro', 'onboarding-cro'] },
      ],
    },
    {
      name: 'API/backend',
      moves: [
        { subject: 'the API contract', benefit: 'making integrations predictable and maintainable', skills: ['api-design', 'api-first-workflow'] },
        { subject: 'the backend architecture', benefit: 'using proven service and data patterns', skills: ['backend-patterns', 'senior-backend'] },
      ],
    },
    {
      name: 'Mobile app',
      moves: [
        { subject: 'the mobile experience', benefit: 'building around platform-native product decisions', skills: ['ccc-mobile', 'mobile-app-builder'] },
        { subject: 'the mobile test suite', benefit: 'catching device and release regressions early', skills: ['mobile-testing', 'test-strategy'] },
      ],
    },
    {
      name: 'Content/marketing',
      moves: [
        { subject: 'the content engine', benefit: 'connecting useful content to a repeatable workflow', skills: ['ccc-marketing', 'content-production'] },
        { subject: 'the search strategy', benefit: 'aligning discoverability with audience intent', skills: ['ccc-seo', 'seo-content-brief'] },
      ],
    },
    {
      name: 'Data/analytics',
      moves: [
        { subject: 'the analytics foundation', benefit: 'turning raw events into dependable insight', skills: ['ccc-data', 'analytics-setup'] },
        { subject: 'the reporting story', benefit: 'making findings clear enough to drive decisions', skills: ['data-visualization', 'data-storytelling'] },
      ],
    },
  ];
  const goals = [
    { name: 'Start it', verb: 'Launch', outcome: 'create a strong first version' },
    { name: 'Improve quality', verb: 'Polish', outcome: 'raise the quality bar' },
    { name: 'Make it faster', verb: 'Speed up', outcome: 'reduce time and friction' },
    { name: 'Make it safer', verb: 'Harden', outcome: 'lower avoidable risk' },
    { name: 'Grow it', verb: 'Grow', outcome: 'build a stronger growth loop' },
  ];

  return projects.flatMap((project) =>
    goals.flatMap((goal) =>
      project.moves.map((move) => {
        const skill = findCatalogSkill(skills, move.skills);
        return {
          project: project.name,
          goal: goal.name,
          title: `${goal.verb} ${move.subject}`,
          why: `Use ${skill.name} to ${goal.outcome} while ${move.benefit}.`,
          cmd: skill.cmd,
        };
      })
    )
  );
}

function assertContractCounts(contract, counts) {
  const checks = [
    ['plugin_skills', counts.pluginSkills],
    ['ecosystem_skills', counts.ecosystemSkills],
    ['specialist_agents', counts.agents],
  ];
  const mismatches = checks
    .filter(([field, actual]) => contract[field] !== actual)
    .map(([field, actual]) => `${field}: contract=${contract[field]}, parsed=${actual}`);
  if (mismatches.length > 0) {
    throw new Error(`Cockpit contract count mismatch; refusing to emit:\n${mismatches.join('\n')}`);
  }
}

function assertSelfContained(output) {
  const externalAttribute = /\b(?:src|href)\s*=\s*(?:["']\s*https?:\/\/|https?:\/\/)/i;
  if (externalAttribute.test(output)) throw new Error('Cockpit output contains an external src/href URL');
  if (/<script\b[^>]*\bsrc\s*=/i.test(output)) throw new Error('Cockpit output contains <script src>');
  const titleCount = (output.match(/<title(?:\s|>)/gi) || []).length;
  if (titleCount !== 1) throw new Error(`Cockpit output must contain exactly one <title>; found ${titleCount}`);
  if (output.includes(DATA_MARKER)) throw new Error('Cockpit data marker was not replaced');
  if (output.includes(BRAND_MARKER)) throw new Error('Cockpit brand-css marker was not replaced');
}

// Linear board is a PRIVATE, opt-in surface: the Cockpit bakes whatever the
// user's own Linear connector cached to ~/.claude/commander/linear-board.json
// at generate time (never a network call at view time). Absent file → the tab
// renders a "connect Linear" empty state. Shape:
//   { connected, board, tickets:[{id,title,state,stateKind,project,updated,stale}] }
function readLinearBoard() {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const file = path.join(home, '.claude', 'commander', 'linear-board.json');
  const str = (v) => (typeof v === 'string' ? v : '');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && Array.isArray(parsed.tickets)) {
      // Structurally sanitize every ticket: coerce to strings, drop non-objects,
      // require an id. esc() in the template is the second layer; this is the
      // first — an untrusted board file can never inject a non-string into the
      // payload (a malicious `title: {toString...}` or `id: ["</script>"]` is
      // flattened to '' here).
      const tickets = parsed.tickets
        .filter((t) => t && typeof t === 'object' && !Array.isArray(t))
        .map((t) => ({
          id: str(t.id),
          title: str(t.title),
          state: str(t.state),
          stateKind: str(t.stateKind),
          project: str(t.project),
          updated: str(t.updated),
          stale: t.stale === true,
        }))
        .filter((t) => t.id);
      return { connected: tickets.length > 0, board: str(parsed.board) || null, tickets };
    }
  } catch {
    /* absent or malformed → not connected */
  }
  return { connected: false };
}

function readJsonl(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const entries = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries.push(parsed);
    } catch {
      // Tolerate partially written and malformed JSONL records.
    }
  }
  return entries;
}

function parseTimestamp(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function safeMetric(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function estimatedCostUsd(inputTokens, outputTokens) {
  return Number(((safeMetric(inputTokens) * 3 + safeMetric(outputTokens) * 15) / 1_000_000).toFixed(4));
}

function formatTokens(tokens) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}m`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return String(tokens);
}

function recentEntries(entries, cutoffMs, nowMs) {
  return entries.filter((entry) => {
    const timestamp = parseTimestamp(entry.ts);
    return timestamp !== null && timestamp >= cutoffMs && timestamp <= nowMs;
  });
}

function buildTopAgents(agentRuns, cutoffMs, nowMs) {
  const grouped = new Map();
  for (const entry of recentEntries(agentRuns, cutoffMs, nowMs)) {
    const name = typeof entry.agent === 'string' && entry.agent.trim() ? entry.agent.trim() : 'unknown';
    // v6.8.1 telemetry stamps source_app; older rows without it are Claude's (Codex can't reach these hooks pre-6.8.1).
    const source = typeof entry.source_app === 'string' && entry.source_app ? entry.source_app : 'claude-code';
    const key = source + ':' + name;
    const current = grouped.get(key) || {
      name,
      source,
      runs: 0,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 0,
      durations: 0,
    };
    current.runs += 1;
    current.inputTokens += safeMetric(entry.inputTokens);
    current.outputTokens += safeMetric(entry.outputTokens);
    if (Number.isFinite(entry.durationMs) && entry.durationMs >= 0) {
      current.durationMs += entry.durationMs;
      current.durations += 1;
    }
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((agent) => ({
      name: agent.source === 'claude-code' ? agent.name : `${agent.name} · ${agent.source}`,
      emoji: (PERSONA_MAP[agent.name.toLowerCase()] || DEFAULT_PERSONA).emoji,
      runs: agent.runs,
      tokens: agent.inputTokens + agent.outputTokens,
      costUsd: estimatedCostUsd(agent.inputTokens, agent.outputTokens),
      avgMs: agent.durations > 0 ? Math.round(agent.durationMs / agent.durations) : 0,
    }))
    .sort((left, right) => right.runs - left.runs || right.tokens - left.tokens || left.name.localeCompare(right.name))
    .slice(0, 10);
}

function buildDaily(agentRuns, nowMs) {
  const now = new Date(nowMs);
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const firstDayMs = todayMs - 13 * 24 * 60 * 60 * 1000;
  const runsByDay = new Map();
  for (const entry of agentRuns) {
    const timestamp = parseTimestamp(entry.ts);
    if (timestamp === null || timestamp < firstDayMs || timestamp > nowMs) continue;
    const key = new Date(timestamp).toISOString().slice(0, 10);
    runsByDay.set(key, (runsByDay.get(key) || 0) + 1);
  }

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(firstDayMs + index * 24 * 60 * 60 * 1000).toISOString();
    return { date: date.slice(5, 10), runs: runsByDay.get(date.slice(0, 10)) || 0 };
  });
}

function buildFlows(events) {
  const grouped = new Map();
  // Session ids never leave the machine as-is: the artifact may be published,
  // so sessions get stable anonymous labels instead of id prefixes.
  const sessionLabels = new Map();
  for (const entry of events) {
    if (entry.type !== 'delegation' && entry.type !== 'workflow') continue;
    const source = entry.session_id || entry.sessionId || entry.from;
    let from = 'session';
    if (source) {
      const raw = String(source);
      if (!sessionLabels.has(raw)) sessionLabels.set(raw, `session-${sessionLabels.size + 1}`);
      from = sessionLabels.get(raw);
    }
    const target = entry.actor || entry.tool;
    if (!target) continue;
    const to = String(target);
    const key = JSON.stringify([from, to]);
    const current = grouped.get(key) || { from, to, count: 0 };
    current.count += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .sort((left, right) => right.count - left.count || left.from.localeCompare(right.from) || left.to.localeCompare(right.to))
    .slice(0, 10);
}

// Both skill tiles derive from the SINGLE shared reader (top-skills.js, the
// Mission Control model's topSkills — CC-1380). No second skill-runs parser
// lives here: this is the "drop Cockpit's raw skill-runs aggregation in favor
// of the model's topSkills" consolidation. topSkills is already sorted runs7d
// desc and capped at 10 (the shared module's scan-discipline cap), so the 7d
// launch total below is the sum over the top-N skills — a machine with >10
// distinct skills in a week undercounts the headline, which the shared cap
// makes an accepted, documented bound.
function skillTilesFromTopSkills(topSkills) {
  const tiles = [];
  const launches7d = topSkills.reduce((sum, row) => sum + (row.runs7d || 0), 0);
  tiles.push({ label: 'Skill launches (7d)', value: launches7d });
  const top3 = [...topSkills]
    .sort((left, right) => right.runs30d - left.runs30d || left.skill.localeCompare(right.skill))
    .slice(0, 3);
  if (top3.length > 0) {
    tiles.push({
      label: 'Most-used skill (30d)',
      value: top3.map((row) => `${row.skill} ×${row.runs30d}`).join(' · '),
    });
  }
  return tiles;
}

function completedTaskCount(tasks, cutoffMs, nowMs) {
  const completedStatuses = new Set(['done', 'complete', 'completed', 'closed', 'resolved', 'finished', 'shipped', 'merged']);
  const latestById = new Map();

  for (const [order, entry] of tasks.entries()) {
    const id = entry.task_id ?? entry.id;
    if (id === null || id === undefined || String(id).trim() === '') continue;
    const timestamp = parseTimestamp(entry.ts);
    if (timestamp === null) continue;
    const key = String(id);
    const existing = latestById.get(key);
    if (existing && (timestamp < existing.timestamp || (timestamp === existing.timestamp && order < existing.order))) continue;
    latestById.set(key, { entry, timestamp, order });
  }

  let completed = 0;
  for (const { entry, timestamp } of latestById.values()) {
    const status = typeof entry.status === 'string' ? entry.status.trim().toLowerCase() : '';
    if (completedStatuses.has(status) && timestamp >= cutoffMs && timestamp <= nowMs) completed += 1;
  }
  return completed;
}

async function buildAnalytics() {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const baseDir = path.join(home, '.claude', 'commander');
  const sources = {
    agentRuns: readJsonl(path.join(baseDir, 'agent-runs.jsonl')),
    subagentRuns: readJsonl(path.join(baseDir, 'subagent-runs.jsonl')),
    tasks: readJsonl(path.join(baseDir, 'tasks.jsonl')),
    events: readJsonl(path.join(baseDir, 'mission-control', 'events.jsonl')),
  };
  const nowMs = Date.now();
  // The single skill-runs reader — the same module Mission Control's roster/
  // topSkills panel uses. bySource gives Claude and Codex counts per skill.
  const topSkills = await readTopSkills({ baseDir, now: nowMs });
  if (topSkills.length === 0 && Object.values(sources).every((entries) => entries.length === 0)) {
    return {};
  }

  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
  const recentAgents = recentEntries(sources.agentRuns, sevenDaysAgo, nowMs);
  const inputTokens = recentAgents.reduce((sum, entry) => sum + safeMetric(entry.inputTokens), 0);
  const outputTokens = recentAgents.reduce((sum, entry) => sum + safeMetric(entry.outputTokens), 0);
  const tiles = [
    { label: 'Agent runs (7d)', value: recentAgents.length },
    { label: 'Tokens (7d)', value: formatTokens(inputTokens + outputTokens) },
    { label: 'Est cost (7d)', value: `$${estimatedCostUsd(inputTokens, outputTokens).toFixed(2)} est` },
    ...skillTilesFromTopSkills(topSkills),
    { label: 'Tasks done (7d)', value: completedTaskCount(sources.tasks, sevenDaysAgo, nowMs) },
  ];

  return {
    tiles,
    topAgents: buildTopAgents(sources.agentRuns, thirtyDaysAgo, nowMs),
    topSkills,
    daily: buildDaily(sources.agentRuns, nowMs),
    flows: buildFlows(sources.events),
  };
}

async function buildDocument() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const pluginFiles = walkFilesNamed(PLUGIN_SKILLS_DIR, 'SKILL.md');
  const ecosystemFiles = walkFilesNamed(ECOSYSTEM_SKILLS_DIR, 'SKILL.md');
  const agentCount = fs
    .readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md')).length;
  const counts = {
    pluginSkills: pluginFiles.length,
    ecosystemSkills: ecosystemFiles.length,
    agents: agentCount,
  };
  assertContractCounts(contract, counts);

  const pluginSkills = buildPluginSkills(pluginFiles);
  const ecosystemSkills = buildEcosystemSkills(ecosystemFiles, buildTierMap());
  const skills = mergeSkills(pluginSkills, ecosystemSkills);
  const agents = buildAgents();
  const payload = {
    meta: {
      version: contract.version,
      generatedAt: new Date().toISOString(),
      pluginSkills: counts.pluginSkills,
      ecosystemSkills: counts.ecosystemSkills,
      agents: counts.agents,
    },
    skills,
    agents,
    jobs: JOBS,
    ideas: buildIdeas(skills),
    patterns: PATTERNS,
    analytics: await buildAnalytics(),
    linear: readLinearBoard(),
  };

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const dataMarkerCount = template.split(DATA_MARKER).length - 1;
  if (dataMarkerCount !== 1) throw new Error(`Expected exactly one Cockpit data marker; found ${dataMarkerCount}`);
  const brandMarkerCount = template.split(BRAND_MARKER).length - 1;
  if (brandMarkerCount !== 1) throw new Error(`Expected exactly one Cockpit brand-css marker; found ${brandMarkerCount}`);
  const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
  const output = template
    .replace(BRAND_MARKER, brandBaseCss())
    .replace(DATA_MARKER, `window.__COCKPIT__ = ${json};`);
  assertSelfContained(output);
  return output;
}

async function main() {
  const { outPath } = parseArgs(process.argv.slice(2));
  const output = await buildDocument();
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output);
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`build-cockpit: ${message}\n`);
  process.exitCode = 1;
});
