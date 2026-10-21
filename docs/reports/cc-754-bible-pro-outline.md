# CC-754 — Bible Pro eBook: slice 1 chapter outline

Status: DRAFT outline for owner review. No upload, payment, listing or pricing action is taken or authorized by this document.
Source: Linear CC-754 (idea), `BIBLE.md` at `3ea789d7` (8.1.0, 3,208 lines). Line numbers below refer to that commit.

## 1. What the eBook is

A PDF/EPUB build of `BIBLE.md` plus Pro-only bonus chapters. The free web `BIBLE.md` stays free and unchanged (CLAUDE.md: core skills, agents, workflows remain free; the eBook is an additional, optional product). Pro must stay a clear superset of the free guide, not a gated copy of it.

## 2. Decisions needed before slice 2

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | Chapter numbering. The ticket calls the bonus chapters 8-10, but `BIBLE.md` has 6 chapters (Stage 1-6, lines 501-1246). | A: number bonus 8-10 and add a free-edition chapter 7; B: number bonus 7-9; C: put bonus content in a separate "Part II: Pro" | **B** — no filler chapter, numbering stays contiguous. |
| D2 | Ticket's Chapter 10 ("case studies from Kevin's consulting clients"). Nothing in the repo supports it; it needs Kevin's material and client consent. | A: write only from Kevin-supplied, anonymized notes; B: replace with repo-grounded case studies (the fleet/orchestrate runs); C: drop for v1 | **C** for v1, with **A** as a later update; do not draft client claims from imagination. |
| D3 | Third-party attribution. `BIBLE.md` distills many named creators ("from @GriffinHilly", "@MichLieben", "@bekacru", "@aiedge_", etc.; credits at lines 1405-1459, 2622-2674). Redistributing in a paid product needs a license/permission check per source. | A: ship all with credits; B: strip or re-write attributed sections for the paid build; C: ask each source | **B+C** — audit each attributed section; keep credits for what stays. |
| D4 | Price/platform (Gumroad vs Lemon Squeezy, $29). | Owner's call | Out of scope; no account or payment work in this slice. |

## 3. Proposed structure

### Front matter (new, small)
- Title page, edition = `package.json` version + date, license notice for the free parts (`LICENSE`, `NOTICE.md`).
- "How to read this" (adapted from the `BIBLE.md` header, lines 1-10: BIBLE vs CHEATSHEET vs SKILLS-INDEX).

### Part I — The Guide (from `BIBLE.md`, free content, reformatted)

| eBook section | Source | Lines | Build note |
|---|---|---|---|
| Golden Rules | `## Golden Rules` | 103-116 | as-is |
| The Kevin Z Method (build types, orchestrator/executor, Fable Method) | `## The Kevin Z Method` | 117-235 | as-is; check model ids vs `docs/reference/platform-facts-2026-10.md` |
| The Loop Taxonomy | `## The Loop Taxonomy` | 236-304 | as-is |
| The Intelligence Layer | `## The Intelligence Layer` | 305-403 | as-is |
| What's New in v8 | `## What's New in v8` | 12-62 | move to an "Edition notes" appendix (it dates quickly) |
| Plugin Skills | `## The 84 Plugin Skills` | 404-500 | **do not embed counts**; generate from the plugin manifest at build time (CLAUDE.md: volatile counts live in canonical sources) |
| Ch. 1 Genesis | Stage 1 | 501-611 | as-is |
| Ch. 2 Foundations | Stage 2 | 612-729 | as-is |
| Ch. 3 Construction | Stage 3 | 730-845 | includes attributed section (774-810) — see D3 |
| Ch. 4 Debugging | Stage 4 | 846-919 | as-is |
| Ch. 5 Deployment | Stage 5 | 920-1031 | Cloudflare-blog section (947-1008) — see D3 |
| Ch. 6 Autonomy | Stage 6 | 1032-1246 | Agent Auth / GitAgent sections attributed — see D3 |

### Part II — Pro bonus chapters (new; not on the web)

**Ch. 7 — Working with junior developers alongside Claude Code** (ticket "Chapter 8")
- Grounding in repo: `/ccc-onboard` (first-hour plan, `BIBLE.md:458`), `ORIENT.md` template (1343-1365), `CLAUDE.md` templates (1247-1342), `/ccc-review` + `ccc-deep-review` workflow, Test-First Bug Fix / anti-sycophancy rule (881-891), `ccc-agent-writing` (specs and PR descriptions a reader can act on).
- Sketch: (1) what a junior needs on day one (ORIENT.md + CLAUDE.md); (2) review loops where Claude reviews and the human decides; (3) teaching with plans rather than answers (`/ccc-plan`); (4) guardrails — hooks, permission mode, safety deck; (5) a 30-day ramp checklist.
- Gap: the repo has no material on mentoring practice itself. Needs Kevin's input or is kept tool-focused.

**Ch. 8 — Multi-agent orchestration patterns** (ticket "Chapter 9")
- Grounding in repo: Orchestrator/Executor model (133-150), Fable Method gates (207-235), verifier-separation rule (279-282), state-file convention (283-304), `## Dynamic Workflows + Ultracode` (2565-2621), the six workflows in `commander/cowork-plugin/workflows/`, skills `ccc-fleet`, `ccc-orchestrate`, `ccc-plan-exec`, `ccc-relay`, `ccc-debate`, `ccc-spawn`, and the role-tier routing in `CLAUDE.md` (Fable/Opus/Sonnet/Haiku).
- Sketch: pattern catalog — fan-out, pipeline, judge panel, debate, relay chain, plan-exec — each with when-to-use, cost shape, failure modes, and the verifier that stops it. Plus a "which pattern?" decision table and a cost-control section.
- Note: "private to Pro" is a positioning choice; the underlying skills/workflows are free and shipped, so the chapter sells explanation, not access. Say so openly in the sales copy.

**Ch. 9 — Production case studies** (ticket "Chapter 10") — **HOLD** pending D2. No source material in the repo.

### Back matter
- Appendices from `BIBLE.md`: Model Selection (2544), Settings Reference (2331), Token Optimization (3113), Contributor Credits (2622), About the Author (3196). Skip or trim: Community Insights (3070), Claude Code v2.191 (3100), ecosystem chapter (3144) — time-sensitive.

## 4. Slice 2+ (not started)

1. Slice 2: resolve D1-D3; draft Ch. 7 and Ch. 8 (source-grounded as above).
2. Slice 3: build pipeline — Markdown to EPUB/PDF (build-time only; no installs without approval), link/anchor fix-up, generated counts.
3. Slice 4: owner review, then — separately authorized — listing and payment wiring.

## 5. Risks

- Cannibalization (ticket): keep Pro a superset (eBook + skills + memory + community).
- Staleness: `BIBLE.md` changes with each release; define an edition policy (e.g. rebuild per minor version).
- Claims: any "production case study" or testimonial must come from real, consented material.
