---
description: "CC Commander Hub — guided AI PM menu. Routes to /ccc:* skills across 11 domains."
---

# /ccc — CC Commander Hub

When activated, ALWAYS start by displaying this brand header:

```
╔═════════════════════════════════════════════╗
║  CC Commander v4.0.0-beta.6                 ║
║  Guided AI PM · 502+ skills · Every AI IDE  ║
╚═════════════════════════════════════════════╝
```

Then:

1. Read version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` if accessible — replace the banner version accordingly. Do NOT shell out to the user's `ccc` binary or any user-level `commander/status-line.js`. The plugin is the source of truth; legacy CLI tools may report stale versions.
2. Detect the user's project context: CWD, current git branch (if any), recent commits (if any), whether `package.json` / `pyproject.toml` / `Cargo.toml` is present, and whether this session is resuming from `~/.claude/sessions/` (ask `ls -t ~/.claude/sessions/*.tmp 2>/dev/null | head -1` — if a recent session exists, mention it).
3. Present the menu below, picking the 1-3 options most relevant to the detected context and marking them as recommended.

## Menu

| # | Option | What it does | Routes to |
|---|--------|-------------|-----------|
| 1 | **Plan a feature** | Spec-first planning with clarifying questions | `/ccc:plan` or the `planner` agent |
| 2 | **Build something** | Scaffold new project or feature | `/ccc:build` (TDD-first) |
| 3 | **Review recent work** | Audit the current branch, diff vs main | `/ccc:review` or the `reviewer` agent |
| 4 | **Design UI/UX** | Visual-first design + polish pass | `ccc-design` skill (38 sub-skills) |
| 5 | **Marketing & content** | Copy, SEO, social, campaigns | `ccc-marketing` skill (45 sub-skills) |
| 6 | **Security audit** | OWASP + adversarial review | `ccc-security` skill + `security-auditor` agent |
| 7 | **DevOps & deploy** | CI/CD, containers, monitoring, runbooks | `ccc-devops` skill (20 sub-skills) |
| 8 | **Research & analyze** | Competitive analysis, market research | `ccc-research` skill + `researcher` agent |
| 9 | **Debug a bug** | Root-cause investigation (Iron Law: no fix without root cause) | `debugger` agent |
| 10 | **Ship this work** | Pre-flight checks, tag, push, release | `deployer` agent or `ccc-devops` deploy skill |

## Output format

After the banner + context line, present the menu as a numbered list. Under each option put a one-line description. End with:

> Type the number, option name, or `/ccc:<keyword>` to start. Or describe what you want in plain English and I'll route you.

## Brand rules

- **Version always reads from plugin.json** — never from a hardcoded string in this file.
- **Emoji-forward headers, tables over paragraphs, decisive recommendations** — match the PM Consultant voice (see `rules/common/response-style.md` if bundled).
- **Never mention legacy `ccc` CLI binaries** — the plugin is the product as of v4.0.
- **502+ skills** is the current count; if `plugin.json.description` mentions a different number, trust `plugin.json`.

## Troubleshooting

If the user says they see a version other than v4.0.0-beta.x when they run `/ccc`:
- Run: `bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/diagnose-ccc-sources.sh)` to find the legacy source.
- Clean with: `bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/reset-commander-install.sh) --full`
- Quit Claude Code/Cowork (Cmd+Q), reopen, and re-run `/ccc`.
