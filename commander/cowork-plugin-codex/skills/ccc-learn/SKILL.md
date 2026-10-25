---
name: ccc-learn
description: "Pick a Commander skill domain (design, marketing, SaaS, DevOps, SEO, testing, security, data) and hand off to its router. Use to explore domains."
allowed-tools:
  - Read
  - Bash
  - Skill
  - AskUserQuestion
argument-hint: "[design | marketing | saas | devops | seo | testing | security | data | research | mobile | makeover | all]"
model: sonnet
effort: low
---

# $ccc-learn — one click to a domain

**CC Commander** · $ccc-learn · a domain picker that loads the matching router skill, which shows its own sub-picker.

## When to use / when not to

- Use when the user wants to discover what Commander can do in an area, or names a domain without a specific task.
- When the intent already maps to one domain ("set up auth"), invoke that router directly (`ccc-saas`) instead of showing the picker.
- Use `$ccc-browse` for the full searchable catalog; this skill never lists every skill.

## What happens

### 1. Check the argument first

If the skill argument names a domain, skip every picker and invoke the router with the Skill tool:

| Argument | Router skill |
|---|---|
| `design` | `ccc-design` |
| `marketing` | `ccc-marketing` |
| `saas` | `ccc-saas` |
| `devops` | `ccc-devops` |
| `seo` | `ccc-seo` |
| `testing` | `ccc-testing` |
| `security` | `ccc-security` |
| `data` | `ccc-data` |
| `research` | `ccc-research` |
| `mobile` | `ccc-mobile` |
| `makeover` | `ccc-makeover` |
| `all` | `ccc-browse` |

An unrecognized argument: say which domains exist (the argument column) and continue to step 2.

### 2. Header and context strip

Print:

```
**CC Commander · Learn** · domain routers · [catalog](https://commanderplugin.com/skills)
```

Gather context in one Bash call, silent on failure:

```bash
ls ~/.claude/skills/ 2>/dev/null | wc -l
test -f CLAUDE.md && head -2 CLAUDE.md | tail -1
git rev-parse --abbrev-ref HEAD 2>/dev/null
ls -d src/components docs 2>/dev/null
ls tailwind.config.* 2>/dev/null
grep -oE '"(stripe|next-auth|@supabase/supabase-js|supabase)"' package.json 2>/dev/null | sort -u
```

Render one line: `📊 <N> user skills installed · project <name or cwd> · branch <name>`. With zero user skills: `📊 No user skills installed — routers load their skills on demand.`

### 3. Choose the recommendation

From the probe, mark exactly one root option 🟢 and list it first:

- `package.json` names `stripe`, `next-auth` or Supabase → SaaS
- `src/components` exists and a Tailwind config exists → Design
- no `src/`, but `docs/` or marketing-style files exist → Marketing
- nothing to go on → Design

### 4. Ask the root picker

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-learn.json` once and use its `description` for the design, marketing and saas entries; if the file is missing, use the descriptions below. Ask the root picker (Decision points). Then dispatch:

- Design → Skill `ccc-design`; Marketing → Skill `ccc-marketing`; SaaS → Skill `ccc-saas`.
- More domains → ask the second picker. Do not end the flow.

### 5. Second and third pickers

- Second picker: DevOps → `ccc-devops`; SEO → `ccc-seo`; Testing → `ccc-testing`; Even more → third picker.
- Third picker: Security → `ccc-security`; Data → `ccc-data`; Browse all → `ccc-browse`; Back → `ccc`.
- Research, Mobile and Makeover are reachable by argument (step 1) or when the user names them; route those directly.

### 6. Hand off

Invoke the chosen router with the Skill tool and stop. The router owns everything after that, including its own picker.

## Decision points

Root picker (reorder so the 🟢 option from step 3 is first):

```
question: "Which domain?"
header: "Learn"
multiSelect: false
options:
  - label: "🟢 🎨 Design"
    description: "UI/UX, animation, responsive, a11y, polish. Opens ccc-design's picker next."
  - label: "Marketing"
    description: "CRO, email, ads, social, content. Opens ccc-marketing's picker next."
  - label: "SaaS"
    description: "Auth, billing, multi-tenant, schema, zero-to-revenue. Opens ccc-saas's picker next."
  - label: "More domains"
    description: "DevOps, SEO, testing, security, data, and browse-all."
```

Second picker:

```
question: "Which domain?"
header: "Learn (2/3)"
multiSelect: false
options:
  - label: "🟢 DevOps"
    description: "CI/CD, Docker, cloud, monitoring, IaC, runbooks. Opens ccc-devops."
  - label: "🌐 SEO"
    description: "Technical SEO, AI search, content strategy, Core Web Vitals. Opens ccc-seo."
  - label: "🧪 Testing"
    description: "TDD, E2E, verification, QA, regression, visual tests. Opens ccc-testing."
  - label: "Even more"
    description: "Security, data, browse-all, or back to the main menu."
```

Third picker:

```
question: "Which one?"
header: "Advanced"
multiSelect: false
options:
  - label: "🟢 🔐 Security"
    description: "Audits, prompt-injection defense, OWASP, incident response. Opens ccc-security."
  - label: "📊 Data"
    description: "Pipelines, SQL, visualization, ML, data quality, vector search. Opens ccc-data."
  - label: "Browse all"
    description: "Searchable catalog of every skill and command. Opens ccc-browse."
  - label: "Back to /ccc"
    description: "Return to the main menu."
```

## Done when

- Exactly one router skill (or `ccc-browse` / `ccc`) was invoked with the Skill tool, and its picker or output followed.
- No picker showed more than 4 options, and no skill list was printed inline.

## Guardrails

- Never render all domains in one picker, and never ask the user to type a number or letter from a text list.
- Never dump the skill catalog inline; that is `$ccc-browse`'s job.
- Never ignore the argument: `$ccc-learn marketing` goes straight to `ccc-marketing`.
- Never print skill counts or versions as literals; routers report their own contents.
- Codex: ask each picker as a plain-text question with the same options, then open the chosen router skill by name.

## See also

- `$ccc-browse` — full catalog with search and launch
- `$ccc-domains` — alias for this picker
- `/ccc` — main menu
- `$ccc-knowledge` — lessons from past work

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
