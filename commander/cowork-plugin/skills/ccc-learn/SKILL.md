---
name: ccc-learn
description: "CC Commander learning hub — click-first picker across 11 CCC domains (502+ skills). Routes to ccc-design, ccc-marketing, ccc-saas and 8 more domain routers. Use when the user types /ccc-learn, says 'browse skills', 'what can this do', 'show me the catalog', 'explore domains', 'learn about marketing', or picks Learn from the /ccc root menu."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[domain: design | marketing | saas | devops | seo | testing | security | data | research | mobile | makeover | all]"
---

# /ccc-learn — Discover skills across domains

Click-first browser over CCC's 11 domain routers. User picks a domain in one click — we load its domain-router skill and hand off. No text menus, no grep-through-502-skills.

## Response shape (EVERY time)

### 1. Brand header (one line)

```
**CC Commander · Learn** · 502+ skills · 11 domains · [catalog](https://cc-commander.com/skills)
```

### 2. Context strip (one line)

Run a single parallel Bash probe (silent on failure):
- `ls ~/.claude/skills/ 2>/dev/null | wc -l` — locally installed skill count
- `test -f CLAUDE.md && head -2 CLAUDE.md | tail -1` — project name hint
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` — branch

Render:
> 📚 <N> skills installed locally · project `<name or cwd>` · branch `<name>`

If nothing installed: "📚 No CCC skills installed yet — pick a domain, I'll fetch on demand."

### 3. The picker — `AskUserQuestion` with 4 options

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-learn.json` once. Use its `choices` for labels + descriptions. **Max 4 options** — take the 3 headline domains + "More domains…".

```
question: "Which domain?"
header: "CC Commander · Learn"
multiSelect: false
options:
  - label: "🎨 Design (39 skills)"
    description: "UI/UX, animation, responsive, a11y, Impeccable polish suite."
    preview: "Routes to ccc-design. Pick landing / components / polish / figma next."
  - label: "📣 Marketing (45 skills)"
    description: "CRO, email, ads, social, content — 7 specialist pods."
    preview: "Routes to ccc-marketing. Pick campaign / SEO / Product Hunt / influencer next."
  - label: "💼 SaaS (21 skills)"
    description: "Auth, billing, multi-tenant, schema, zero-to-revenue."
    preview: "Routes to ccc-saas. Pick auth / billing / schema / API next."
  - label: "⋯ More domains…"
    description: "DevOps, SEO, Testing, Security, Data, Research, Mobile, Makeover."
    preview: "8 more router skills — click to expand."
```

**Recommendation logic** (prepend ⭐ to ONE option):
- No `src/` but project has `docs/` or marketing-ish files → ⭐ Marketing
- `package.json` has `stripe` / `next-auth` / `supabase` → ⭐ SaaS
- `src/components` populated + Tailwind config → ⭐ Design
- Nothing to go on → ⭐ Design (safe default)

Also offer "Browse all 502+" as a small footer note under the picker — see handling below.

### 4. Handle the selection

Dispatch immediately:

- **Design** → invoke `ccc-design` skill. That skill surfaces its own picker (landing / components / polish / figma).
- **Marketing** → invoke `ccc-marketing` skill. Surfaces its sub-picker.
- **SaaS** → invoke `ccc-saas` skill. Surfaces its sub-picker.
- **More domains…** → cascade to the **second AUQ** below. Do NOT exit the flow.

### 5. Second AUQ (only if "More domains…" picked)

```
question: "Which of the remaining 8?"
header: "CC Commander · Learn · More"
multiSelect: false
options:
  - label: "🛠️ DevOps (21 skills)"
    description: "CI/CD, Docker, AWS, monitoring, IaC, runbooks."
    preview: "Routes to ccc-devops."
  - label: "🔍 SEO (20 skills)"
    description: "Technical SEO, AI search, content strategy, Core Web Vitals."
    preview: "Routes to ccc-seo."
  - label: "🧪 Testing (15 skills)"
    description: "TDD, E2E, verification, QA, regression, visual testing."
    preview: "Routes to ccc-testing."
  - label: "⋯ Even more…"
    description: "Security, Data, Research, Mobile, Makeover + browse-all."
    preview: "5 more — click to cascade."
```

### 6. Third AUQ (only if "Even more…" picked)

```
question: "Last page."
header: "CC Commander · Learn · Advanced"
multiSelect: false
options:
  - label: "🔐 Security (8 skills)"
    description: "Audits, prompt injection defense, OWASP, incident response."
    preview: "Routes to ccc-security."
  - label: "📊 Data (8 skills)"
    description: "Pipelines, SQL, visualization, ML, quality, vector search."
    preview: "Routes to ccc-data."
  - label: "🔎 Browse all (502+)"
    description: "Searchable grid of every installed skill + command."
    preview: "Routes to ccc-browse."
  - label: "↩️ Back to /ccc"
    description: "Return to the main menu."
    preview: "Invokes ccc skill."
```

**Remaining domain routers** not surfaced in AUQ but available by argument:
- `ccc-research` (8 skills) — `/ccc-learn research`
- `ccc-mobile` (8 skills) — `/ccc-learn mobile`
- `ccc-makeover` (3 skills) — `/ccc-learn makeover`

These tail-end domains are thin. If a user explicitly asks about them, route directly.

### 7. Argument handling

If the user passed an argument (`/ccc-learn marketing`), skip all AUQs and invoke the matching domain router immediately. Accept: `design` / `marketing` / `saas` / `devops` / `seo` / `testing` / `security` / `data` / `research` / `mobile` / `makeover` / `all` (→ `ccc-browse`).

## Anti-patterns — DO NOT

- ❌ Render all 11 domains in one AUQ (max 4 per call)
- ❌ Dump the 502-skill list inline — that's ccc-browse's job
- ❌ Skip the cascade — users need the "More → Even more" flow for the long tail
- ❌ Show a numbered text list and ask them to type a number
- ❌ Forget to check the argument — `/ccc-learn marketing` must skip the root picker

## When to invoke this skill

- user: what does this do? show me the skill catalog
- assistant: Loads ccc-learn, renders the 4-option picker. User picks Design → routes to ccc-design.

- user: I need to set up authentication
- assistant: Loads ccc-learn (or goes straight to ccc-saas if intent is clear). Picks SaaS → ccc-saas auth path.

- user: what's in the marketing domain?
- assistant: Loads ccc-learn with `marketing` argument, skips root picker, dispatches to ccc-marketing directly.

---

**Bottom line:** one click picks a domain, the domain router takes it from there. Cascade for the long tail. Never dump 502 skills on the user.
