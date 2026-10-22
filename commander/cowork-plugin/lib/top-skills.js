/**
 * top-skills.js
 * "Top skills" panel for Commander Mission Control (CC-1380 Item 4) — a
 * contract owed to Cockpit (CC-1379): {skill, runs7d, runs30d, bySource}
 * rows read from ~/.claude/commander/skill-runs.jsonl
 * (`{ts, skill, source_app, session_id}`).
 *
 * Zero-state tolerant and NOT blocking: the writer
 * (hooks/skill-runs-logger.js) ships with Cockpit v6.8.2 — on main as
 * of that release, writing `{ts, skill, source_app, session_id}` rows
 * exactly matching the shape this reader expects. Still zero-state
 * tolerant on a machine that predates v6.8.2 (or simply hasn't run a
 * skill yet): missing file → []. This module never writes
 * skill-runs.jsonl — that's the hook's job (CC-1379).
 *
 * Rows lacking source_app count into 'claude-code' (pre-fix history —
 * before a source_app-aware writer existed).
 *
 * Bounded reads (Item 6 scan discipline): caps at MAX_JSONL_LINES
 * parsed — a higher-volume log beyond the cap silently drops the
 * oldest entries, undercounting runs30d for very old activity.
 * Fail-open: any read/parse error yields [], never throws.
 *
 * Core free forever — no license check, no tier gating.
 */
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_JSONL_LINES = 5000; // Item 6 bounded-scan cap
const TOP_SKILLS_CAP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_7D_MS = 7 * DAY_MS;
const WINDOW_30D_MS = 30 * DAY_MS;

function defaultBaseDir() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude', 'commander');
}

function skillRunsFile(baseDir) {
  return path.join(baseDir || defaultBaseDir(), 'skill-runs.jsonl');
}

function parseTs(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function readJsonlBounded(filePath, maxLines = MAX_JSONL_LINES) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter((line) => line.trim());
  const tail = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;

  const entries = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

/**
 * Read + aggregate skill-runs.jsonl into topSkills rows: {skill, runs7d,
 * runs30d, bySource}, sorted by runs7d desc, capped at 10. Missing file
 * or any error → []. Never throws.
 */
async function readTopSkills({ baseDir, now } = {}) {
  try {
    const entries = await readJsonlBounded(skillRunsFile(baseDir));
    if (entries.length === 0) return [];

    const nowMs = now instanceof Date ? now.getTime() : Number.isFinite(now) ? now : Date.now();
    const bySkill = new Map();

    for (const entry of entries) {
      const skill = typeof entry.skill === 'string' && entry.skill.trim() ? entry.skill.trim() : null;
      if (!skill) continue;
      const ms = parseTs(entry.ts);
      if (ms === null) continue;
      const ageMs = nowMs - ms;
      if (ageMs < 0 || ageMs > WINDOW_30D_MS) continue;

      const sourceApp =
        typeof entry.source_app === 'string' && entry.source_app.trim()
          ? entry.source_app.trim()
          : 'claude-code';

      let row = bySkill.get(skill);
      if (!row) {
        row = { skill, runs7d: 0, runs30d: 0, bySource: {} };
        bySkill.set(skill, row);
      }
      row.runs30d += 1;
      if (ageMs <= WINDOW_7D_MS) row.runs7d += 1;
      row.bySource[sourceApp] = (row.bySource[sourceApp] || 0) + 1;
    }

    return [...bySkill.values()]
      .sort((left, right) => right.runs7d - left.runs7d || right.runs30d - left.runs30d)
      .slice(0, TOP_SKILLS_CAP);
  } catch {
    return [];
  }
}

export { readTopSkills, skillRunsFile };
