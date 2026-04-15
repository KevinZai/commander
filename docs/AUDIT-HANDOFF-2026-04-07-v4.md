# Repo Re-Audit Handoff (2026-04-07, v4)

## Overall Score
- **91 / 100**
- Previous: v1=71, v2=82, v3=88

## Summary
This re-audit confirms the major v3 blockers were remediated:
- session ID allowlist + literal tmux send-keys in `tmuxDispatch` is present
- ESLint now passes under current config (TS test subtree excluded)
- CLAUDE stats line updated to 453 CLI-visible skills
- `status-line.js` now uses full semver (`2.3.0`, no `.0` strip)

Remaining notable issues are mostly UX/consistency and one known dependency risk.

## Priority Findings (file:line)

1. **Medium** — `q` hotkey does not quit in main menu despite hint bar saying `[q] quit`
- Evidence from live E2E: sending `q` did not produce end bookend and remained in menu (`/tmp/ccc-quit.txt`).
- Root cause in key handler:
  - `commander/tui.js:509-511` only quits on `q` when no menu item starts with `q`.
  - Main menu contains `Quit`, so `hasQItem` is true and `q` does not exit.
- Impact: misleading navigation contract in live CLI.

2. **Medium** — Dashboard dependency risk remains (`2 moderate`)
- `dashboard npm audit` still reports:
  - `GHSA-67mh-4wv8-2f99` (`esbuild`)
  - `GHSA-4w7w-66w2-5vf9` (`vite`)
- `fixAvailable` path is `vite@8.0.7` (major).
- Impact: known moderate vulnerability surface remains in `dashboard/`.

3. **Low** — Main-menu live capture does not include expected bookend start / rounded panel markers under tmux capture-pane flow
- Requested checks failed in live run:
  - `FAIL: no bookend` (no `┌` in `/tmp/ccc-menu.txt`)
  - `FAIL: no panel` (no `╭` in `/tmp/ccc-menu.txt`)
- Note: help overlay *does* render rounded panel (`╭╮╰╯`) in `/tmp/ccc-help.txt`.
- Potentially layout/capture timing behavior, but from strict validation criteria this is a fail.

4. **Low** — README test badge count is stale vs actual test count
- README badge shows `168_Tests_Passing` at `README.md:9`.
- Actual suite run is `187` tests (`npm test`).
- Impact: numeric consistency drift in public docs.

## What Passed

### Core checks
- `npm test` → **PASS** (`187/187`, 14 suites)
- `npx eslint . --max-warnings 120` → **PASS** (`0 errors`, `118 warnings` <= 120)
- `npm audit --json`:
  - root → **PASS** (`0` vulns)
  - dashboard → **FAIL** (`2 moderate`)
  - video → **PASS** (`0` vulns)
- `node bin/kc.js --test` → **PASS** (`27/27`)
- `node scripts/audit-counts.js --check` → **PASS**
- `node scripts/audit-counts.js --json` → **PASS**

### Syntax / scans
- JS syntax (`hooks/*.js`, `commander/*.js`, `bin/*.js`, `scripts/*.js`) → **PASS**
- Secrets scan (CI grep pattern) → **PASS**
- PII scan (CI grep pattern) → **PASS**

### Security target validations
- `commander/engine.js` tmuxDispatch sanitization → **PASS**
  - allowlist regex at `commander/engine.js:60`
  - tainted IDs replaced with UUID at `commander/engine.js:61`
  - literal send mode (`-l`) used for command emission at `commander/engine.js:64`, `68`, `73`
- YOLO env gate + confirmation gate → **PASS**
  - env gate check `commander/engine.js:835-839`
  - explicit `yes` gate `commander/engine.js:844-847`
- `commander/state.js` `0o600` write protections → **PASS**
  - state/sessions/history writes at `state.js:51,107,132,154,230,260,269`
- `dispatcher.generateSessionName()` slug safety → **PASS**
  - sanitizer implementation `commander/dispatcher.js:7-9`

### New feature validations
- `claude-finder` resolution chain works → **PASS** (`resolved: ~/.local/bin/claude`)
- `tui.js` pipe-rail / radios / help / mouse features exercised in live tmux flow
  - diamond/radios/hotkeys/help popup all rendered
- `cockpit` compact footer:
  - shows time-remaining brackets and auth source marker → **PASS**
- Adventure JSON completeness / dead-end check → **PASS** (`Adventures: 14 Errors: 0`)
- Main menu separators/grouping → **PASS** (`Separators: 4`)
- tmux script syntax + Ctrl+A bindings → **PASS**

### Version and count consistency
- Version consistency across key files → **PASS**
  - `package.json:2.3.0`
  - `commander/branding.js` uses package version (`branding.js:11`)
  - `CHANGELOG.md` latest `2.3.0`
  - README version badge `v2.3.0`
  - `status-line.js` now uses `pkg.version` directly (`status-line.js:99`)
- Skill counts:
  - `kc --list-skills --json` = `453`
  - disk `SKILL.md` = `458`
  - `CLAUDE.md` stats now `453` (`CLAUDE.md:138`) → aligned
- Vendor submodules (`graphify`, `ui-ux-pro-max-skill`) present in `.gitmodules:52-57` and referenced docs/skills

### CI workflow checks
- CI includes requested test steps plus audit-counts check
- `Run *test*` steps counted: `10` (includes vendor+orchestrator)
- `Verify doc counts` step exists

## Repro Commands Run
- `npm test`
- `npx eslint . --max-warnings 120`
- `npm audit --json`
- `cd dashboard && npm audit --json`
- `cd video && npm audit --json`
- `node bin/kc.js --test`
- `node scripts/audit-counts.js --check`
- `node scripts/audit-counts.js --json`
- JS `node --check` loops across `hooks/*.js`, `commander/*.js`, `bin/*.js`, `scripts/*.js`
- CI secrets/PII grep commands from `.github/workflows/ci.yml`
- tmux live E2E flow (launch/capture/nav/help/quit/cleanup)
- claude-finder, regex injection, cockpit footer, adventure/dead-end, separator, YOLO env gate commands

## Live tmux E2E result flags
- `FAIL: no bookend`
- `PASS: active diamond`
- `PASS: radio selected`
- `PASS: radio unselected`
- `PASS: hotkey bar`
- `FAIL: no panel`
- `PASS: help popup`
- `FAIL: no end bookend`

## Full tmux capture-pane output

### /tmp/ccc-menu.txt
```text





│
◆  What would you like to do?
│  ● Open a project
│     Optional: import local CLAUDE.md + .claude/ context
│
│  ○ Build something new
│     Code, websites, APIs, CLI tools
│  ○ Create content
│     Marketing, social media, writing
│
│  ○ Research & analyze
│     Competitive analysis, reports, audits
│  ○ Review what I built
│     Recent sessions and results
│  ○ Learn a new skill
│     Browse 450+ skills and guides
│  ○ Check my stats
│     Dashboard, streaks, achievements
│  ○ Linear board
│     View issues, pick tasks, track work
│  ○ Night Mode
│     8-hour autonomous build
│
│  ○ Settings
│     Name, level, cost, theme
│  ○ Change theme
│  ○ Infrastructure & Fleet
│     Fleet Commander, Synapse, Cost tracking, CloudCLI
│  ○ Type a command
│     Free-text prompt — describe anything or type /commands
│
│  ○ Quit
│
│  [↑↓] navigate  [enter] select  [q] quit  [?] help

```

### /tmp/ccc-nav.txt
```text
│     Browse 450+ skills and guides
│  ○ Check my stats
│     Dashboard, streaks, achievements
│  ○ Linear board
│     View issues, pick tasks, track work
│
◆  What would you like to do?
│  ○ Open a project
│     Optional: import local CLAUDE.md + .claude/ context
│
│  ● Build something new
│     Code, websites, APIs, CLI tools
│  ○ Create content
│     Marketing, social media, writing
│
│  ○ Research & analyze
│     Competitive analysis, reports, audits
│  ○ Review what I built
│     Recent sessions and results
│  ○ Learn a new skill
│     Browse 450+ skills and guides
│  ○ Check my stats
│     Dashboard, streaks, achievements
│  ○ Linear board
│     View issues, pick tasks, track work
│  ○ Night Mode
│     8-hour autonomous build
│
│  ○ Settings
│     Name, level, cost, theme
│  ○ Change theme
│  ○ Infrastructure & Fleet
│     Fleet Commander, Synapse, Cost tracking, CloudCLI
│  ○ Type a command
│     Free-text prompt — describe anything or type /commands
│
│  ○ Quit
│
│  [↑↓] navigate  [enter] select  [q] quit  [?] help

```

### /tmp/ccc-help.txt
```text
│     View issues, pick tasks, track work
│
◆  What would you like to do?
│  ○ Open a project
│     Optional: import local CLAUDE.md + .claude/ context
│
│  ● Build something new
│     Code, websites, APIs, CLI tools
│  ○ Create content
│     Marketing, social media, writing
│
│  ○ Research & analyze
│     Competitive analysis, reports, audits
│  ○ Review what I built
│     Recent sessions and results
│  ○ Learn a new skill
│     Browse 450+ skills and guides
│  ○ Check my stats
│     Dashboard, streaks, achievements
│  ○ Linear board
│     View issues, pick tasks, track work

╭───────────────────────────────────────╮
│   CC Commander — Quick Help           │
│                                       │
│   ↑/↓     Navigate menu               │
│   Enter   Select item                 │
│   a-z     Jump to item by letter      │
│   q       Quit / Go back              │
│   ?       This help                   │
│                                       │
│   In tmux split mode:                 │
│   Ctrl+A ←→  Switch panes             │
│   Ctrl+A z   Zoom pane (fullscreen)   │
│   Ctrl+A 0   Jump to menu             │
│   Click      Select pane (mouse on)   │
│                                       │
│   Press any key to close...           │
╰───────────────────────────────────────╯

```

### /tmp/ccc-quit.txt
```text





│
◆  What would you like to do?
│  ● Open a project
│     Optional: import local CLAUDE.md + .claude/ context
│
│  ○ Build something new
│     Code, websites, APIs, CLI tools
│  ○ Create content
│     Marketing, social media, writing
│
│  ○ Research & analyze
│     Competitive analysis, reports, audits
│  ○ Review what I built
│     Recent sessions and results
│  ○ Learn a new skill
│     Browse 450+ skills and guides
│  ○ Check my stats
│     Dashboard, streaks, achievements
│  ○ Linear board
│     View issues, pick tasks, track work
│  ○ Night Mode
│     8-hour autonomous build
│
│  ○ Settings
│     Name, level, cost, theme
│  ○ Change theme
│  ○ Infrastructure & Fleet
│     Fleet Commander, Synapse, Cost tracking, CloudCLI
│  ○ Type a command
│     Free-text prompt — describe anything or type /commands
│
│  ○ Quit
│
│  [↑↓] navigate  [enter] select  [q] quit  [?] help

```
